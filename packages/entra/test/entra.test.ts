import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { simulation, defaultUser } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { decodeJwt, type JWTPayload } from "jose";
import { stringify } from "querystring";
import { createPkcePair } from "./helpers.ts";

let basePort = 4411;
let host = "https://localhost";
let tenant = "0e8a3b8a-0000-4000-a000-0000000000ab";
let baseUrl = `${host}:${basePort}`;
let authority = `${baseUrl}/${tenant}`;
let clientId = "00000000-0000-0000-0000-000000000000";
let redirectUri = "http://localhost:3000/auth/callback";
let person = defaultUser;

// A cookie jar just rich enough to carry the simulator's session cookie between
// the login POST and a follow-up silent /authorize request.
const cookieHeader = (res: Response): string =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

describe("Entra ID simulator", () => {
  let server: FoundationSimulatorListening<unknown>;
  beforeAll(async () => {
    const app = simulation();
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  it("has a heartbeat", async () => {
    let res = await fetch(`${authority}/oauth2/v2.0/heartbeat`);
    expect(res.ok).toBe(true);
  });

  describe("/authorize", () => {
    it("renders a login page for an interactive request", async () => {
      let { challenge } = createPkcePair();
      let res = await fetch(
        `${authority}/oauth2/v2.0/authorize?${stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          response_mode: "query",
          scope: "openid profile email offline_access",
          state: "state-123",
          nonce: "nonce-abc",
          code_challenge: challenge,
          code_challenge_method: "S256",
        })}`,
      );

      expect(res.ok).toBe(true);
      expect(res.headers.get("content-type")).toContain("text/html");
      let body = await res.text();
      expect(body).toContain("Sign in");
      // PKCE challenge is carried through the login form as a hidden field
      expect(body).toContain(`name="code_challenge"`);
      expect(body).toContain(challenge);
    });

    it("returns login_required for prompt=none without a session", async () => {
      let res = await fetch(
        `${authority}/oauth2/v2.0/authorize?${stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid",
          prompt: "none",
          state: "st",
        })}`,
        { redirect: "manual" },
      );

      expect(res.status).toBe(302);
      let location = res.headers.get("location")!;
      expect(location).toContain("error=login_required");
      expect(location).toContain("state=st");
    });
  });

  describe("authorization code + PKCE flow", () => {
    let pkce = createPkcePair();

    const login = (extra: Record<string, string> = {}) =>
      fetch(`${authority}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        redirect: "manual",
        body: stringify({
          username: person.email,
          password: person.password,
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          response_mode: "query",
          scope: "openid profile email offline_access",
          state: "state-123",
          nonce: "nonce-abc",
          code_challenge: pkce.challenge,
          code_challenge_method: "S256",
          ...extra,
        }),
      });

    it("redirects back to redirect_uri with a code and state on valid login", async () => {
      let res = await login();
      expect(res.status).toBe(302);
      let location = new URL(res.headers.get("location")!);
      expect(`${location.origin}${location.pathname}`).toBe(redirectUri);
      expect(location.searchParams.get("code")).toBeTruthy();
      expect(location.searchParams.get("state")).toBe("state-123");
    });

    it("re-renders the login page with a 401 on invalid credentials", async () => {
      let res = await login({ password: "wrong" });
      expect(res.status).toBe(401);
      let body = await res.text();
      expect(body).toContain("incorrect");
    });

    it("exchanges the code for id, access and refresh tokens", async () => {
      let loginRes = await login();
      let code = new URL(loginRes.headers.get("location")!).searchParams.get("code")!;

      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: pkce.verifier,
        }),
      });

      expect(res.ok).toBe(true);
      let json = (await res.json()) as {
        token_type: string;
        id_token: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
        ext_expires_in: number;
      };

      expect(json.token_type).toBe("Bearer");
      expect(json.expires_in).toBe(3600);
      expect(json.ext_expires_in).toBe(3600);
      expect(json.refresh_token).toBeTruthy();

      let idToken = decodeJwt(json.id_token);
      expect(idToken.iss).toBe(`${authority}/v2.0`);
      expect(idToken.aud).toBe(clientId);
      expect(idToken.tid).toBe(tenant);
      expect(idToken.ver).toBe("2.0");
      expect(idToken.oid).toBe(person.id);
      expect(idToken.sub).toBe(person.id);
      expect(idToken.preferred_username).toBe(person.email);
      expect(idToken.email).toBe(person.email);
      expect(idToken.nonce).toBe("nonce-abc");

      let accessToken = decodeJwt(json.access_token);
      expect(accessToken.iss).toBe(`${authority}/v2.0`);
      expect(accessToken.tid).toBe(tenant);
      expect(accessToken.azp).toBe(clientId);
      // reserved OIDC scopes are stripped from scp
      expect(accessToken.scp).toBe("email");
    });

    it("verifies the id_token header carries the JWKS kid", async () => {
      let loginRes = await login();
      let code = new URL(loginRes.headers.get("location")!).searchParams.get("code")!;
      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: pkce.verifier,
        }),
      });
      let json = (await res.json()) as { id_token: string };
      let header = JSON.parse(
        Buffer.from(json.id_token.split(".")[0]!, "base64url").toString("utf8"),
      );
      expect(header.alg).toBe("RS256");
      expect(header.typ).toBe("JWT");
      expect(header.kid).toBeTruthy();
    });

    it("rejects the exchange when the PKCE verifier does not match", async () => {
      let loginRes = await login();
      let code = new URL(loginRes.headers.get("location")!).searchParams.get("code")!;

      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: "not-the-right-verifier",
        }),
      });

      expect(res.ok).toBe(false);
      expect(res.status).toBe(400);
    });
  });

  describe("refresh_token grant", () => {
    let pkce = createPkcePair();
    let refreshToken: string;

    beforeEach(async () => {
      let loginRes = await fetch(`${authority}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        redirect: "manual",
        body: stringify({
          username: person.email,
          password: person.password,
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid offline_access",
          code_challenge: pkce.challenge,
          code_challenge_method: "S256",
        }),
      });
      let code = new URL(loginRes.headers.get("location")!).searchParams.get("code")!;
      let tokenRes = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          code_verifier: pkce.verifier,
        }),
      });
      refreshToken = ((await tokenRes.json()) as { refresh_token: string }).refresh_token;
    });

    it("issues fresh tokens from a refresh_token", async () => {
      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: clientId,
        }),
      });

      expect(res.ok).toBe(true);
      let json = (await res.json()) as { access_token: string; id_token: string };
      let idToken = decodeJwt(json.id_token);
      expect(idToken.sub).toBe(person.id);
    });
  });

  describe("client_credentials grant", () => {
    it("issues an app-only access token with no id_token", async () => {
      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "client_credentials",
          client_id: "api-client",
          client_secret: "secret",
          scope: "https://graph.microsoft.com/.default",
          resource: "https://graph.microsoft.com",
        }),
      });

      expect(res.ok).toBe(true);
      let json = (await res.json()) as {
        access_token: string;
        id_token?: string;
        refresh_token?: string;
      };
      expect(json.id_token).toBeUndefined();
      expect(json.refresh_token).toBeUndefined();

      let accessToken = decodeJwt(json.access_token);
      expect(accessToken.aud).toBe("https://graph.microsoft.com");
      expect(accessToken.azp).toBe("api-client");
      expect(accessToken.sub).toBe("api-client");
      expect(Array.isArray((accessToken as JWTPayload & { roles: unknown }).roles)).toBe(true);
    });
  });

  describe("password (ROPC) grant", () => {
    it("issues tokens for valid username/password", async () => {
      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "password",
          username: person.email,
          password: person.password,
          client_id: clientId,
          scope: "openid profile email",
        }),
      });

      expect(res.ok).toBe(true);
      let json = (await res.json()) as { id_token: string };
      expect(decodeJwt(json.id_token).email).toBe(person.email);
    });

    it("rejects invalid credentials with 401", async () => {
      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "password",
          username: person.email,
          password: "nope",
          client_id: clientId,
          scope: "openid",
        }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("/oidc/userinfo", () => {
    let accessToken: string;
    beforeEach(async () => {
      let res = await fetch(`${authority}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: stringify({
          grant_type: "password",
          username: person.email,
          password: person.password,
          client_id: clientId,
          scope: "openid profile email",
        }),
      });
      accessToken = ((await res.json()) as { access_token: string }).access_token;
    });

    it("returns the user's profile from a bearer token", async () => {
      let res = await fetch(`${baseUrl}/oidc/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      expect(res.ok).toBe(true);
      let user = (await res.json()) as { name: string; email: string; sub: string };
      expect(user.name).toBe(person.name);
      expect(user.email).toBe(person.email);
      expect(user.sub).toBe(person.id);
    });

    it("401s without a token", async () => {
      let res = await fetch(`${baseUrl}/oidc/userinfo`);
      expect(res.status).toBe(401);
    });
  });

  describe("silent authentication via session cookie", () => {
    it("issues a code without re-prompting once a session exists", async () => {
      let pkce = createPkcePair();
      let loginRes = await fetch(`${authority}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        redirect: "manual",
        body: stringify({
          username: person.email,
          password: person.password,
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid",
          code_challenge: pkce.challenge,
          code_challenge_method: "S256",
        }),
      });
      let cookie = cookieHeader(loginRes);
      expect(cookie).toContain("session");

      let silent = await fetch(
        `${authority}/oauth2/v2.0/authorize?${stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid",
          prompt: "none",
          state: "silent-state",
        })}`,
        { headers: { cookie }, redirect: "manual" },
      );

      expect(silent.status).toBe(302);
      let location = new URL(silent.headers.get("location")!);
      expect(location.searchParams.get("code")).toBeTruthy();
      expect(location.searchParams.get("state")).toBe("silent-state");
    });
  });

  describe("/logout", () => {
    it("redirects to post_logout_redirect_uri", async () => {
      let res = await fetch(
        `${authority}/oauth2/v2.0/logout?${stringify({
          post_logout_redirect_uri: "http://localhost:3000/",
        })}`,
        { redirect: "manual" },
      );
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("http://localhost:3000/");
    });
  });
});
