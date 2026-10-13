import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { simulation } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { stringify } from "querystring";
import { decodeJwt } from "jose";

let basePort = 4440;
let auth0Url = `https://localhost:${basePort}`;
let clientId = "00000000000000000000000000000000";

let seeded = { name: "Seeded", email: "seeded@example.com", password: "seeded-pw" };

describe("signup", () => {
  let server: FoundationSimulatorListening<unknown>;

  let signup = (body: Record<string, unknown>) =>
    fetch(`${auth0Url}/dbconnections/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        connection: "Username-Password-Authentication",
        ...body,
      }),
    });

  let login = (username: string, password: string) =>
    fetch(`${auth0Url}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "password", client_id: clientId, username, password }),
    });

  let loginPage = async (query: Record<string, string>) => {
    let res = await fetch(`${auth0Url}/login?${stringify({ client_id: clientId, ...query })}`);
    expect(res.status).toBe(200);
    return res.text();
  };

  beforeAll(async () => {
    server = await simulation({ initialState: { users: [seeded] } }).listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  describe("/authorize", () => {
    it("forwards screen_hint and login_hint to the login page", async () => {
      let res = await fetch(
        `${auth0Url}/authorize?${stringify({
          client_id: clientId,
          redirect_uri: "http://localhost:3000/callback",
          response_type: "code",
          nonce: "n",
          state: "s",
          screen_hint: "signup",
          login_hint: "new@example.com",
        })}`,
        { redirect: "manual" },
      );

      let location = new URL(res.headers.get("location")!, auth0Url);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("screen_hint")).toBe("signup");
      expect(location.searchParams.get("login_hint")).toBe("new@example.com");
    });

    it("leaves hints off the login page when none were given", async () => {
      let res = await fetch(`${auth0Url}/authorize?${stringify({ client_id: clientId })}`, {
        redirect: "manual",
      });

      let location = new URL(res.headers.get("location")!, auth0Url);
      expect(location.searchParams.has("screen_hint")).toBe(false);
      expect(location.searchParams.has("login_hint")).toBe(false);
    });
  });

  describe("/login", () => {
    it("renders the login form by default", async () => {
      let html = await loginPage({});
      expect(html).toContain("webAuth.login(");
      expect(html).not.toContain("webAuth.signup(");
    });

    it("renders a signup form for screen_hint=signup", async () => {
      let html = await loginPage({ screen_hint: "signup" });
      expect(html).toContain("<title>signup</title>");
      expect(html).toContain("webAuth.signup(");
    });

    it("prefills the email from login_hint", async () => {
      let html = await loginPage({ screen_hint: "signup", login_hint: "new@example.com" });
      expect(html).toContain('value="new@example.com"');
    });

    it("links between login and signup, keeping the rest of the query", async () => {
      let switchHref = (html: string) =>
        new URL(
          html.match(/id="switch-mode"[^>]*href="([^"]+)"/)![1].replace(/&amp;/g, "&"),
          auth0Url,
        );

      let toSignup = switchHref(await loginPage({ state: "s" }));
      expect(toSignup.searchParams.get("screen_hint")).toBe("signup");
      expect(toSignup.searchParams.get("state")).toBe("s");

      let toLogin = switchHref(await loginPage({ state: "s", screen_hint: "signup" }));
      expect(toLogin.searchParams.has("screen_hint")).toBe(false);
      expect(toLogin.searchParams.get("state")).toBe("s");
    });

    it("escapes login_hint", async () => {
      let html = await loginPage({ login_hint: '"><script>alert(1)</script>' });
      expect(html).not.toContain("<script>alert(1)</script>");
      expect(html).toContain("&quot;&gt;&lt;script&gt;");
    });
  });

  describe("/dbconnections/signup", () => {
    it("creates a user who can then log in", async () => {
      let res = await signup({
        email: "New.User@example.com",
        password: "new-pw",
        name: "New User",
        user_metadata: { plan: "trial" },
      });

      expect(res.status).toBe(200);
      let body = (await res.json()) as Record<string, unknown>;
      expect(body).toMatchObject({ email: "new.user@example.com", email_verified: false });
      expect(body._id).toEqual(expect.any(String));

      let tokens = await login("new.user@example.com", "new-pw");
      expect(tokens.status).toBe(200);
      let { id_token } = (await tokens.json()) as { id_token: string };
      expect(decodeJwt(id_token)).toMatchObject({
        sub: `auth0|${body._id}`,
        name: "New User",
        email: "new.user@example.com",
        email_verified: false,
      });
    });

    it("treats a null user_metadata as none", async () => {
      let res = await signup({
        email: "null-meta@example.com",
        password: "pw",
        user_metadata: null,
      });
      expect(res.status).toBe(200);
    });

    it("refuses an email that has already signed up", async () => {
      let res = await signup({ email: "SEEDED@example.com", password: "other-pw" });

      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "invalid_signup", statusCode: 400 });
    });

    it.each([
      ["email", { password: "pw" }],
      ["password", { email: "missing-pw@example.com" }],
    ])("requires %s", async (_, body) => {
      let res = await signup(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ code: "invalid_body", statusCode: 400 });
    });
  });
});

describe("signup with disableSignup", () => {
  let server: FoundationSimulatorListening<unknown>;
  let url = `https://localhost:${basePort + 1}`;

  beforeAll(async () => {
    server = await simulation({ options: { disableSignup: true } }).listen(basePort + 1);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  it("renders the login form for screen_hint=signup, without a link to sign up", async () => {
    let res = await fetch(
      `${url}/login?${stringify({ client_id: clientId, screen_hint: "signup" })}`,
    );
    let html = await res.text();
    expect(html).toContain("<title>login</title>");
    expect(html).not.toContain("webAuth.signup(");
    expect(html).not.toContain('id="switch-mode"');
  });

  it("refuses /dbconnections/signup", async () => {
    let res = await fetch(`${url}/dbconnections/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        connection: "Username-Password-Authentication",
        email: "new@example.com",
        password: "pw",
      }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "operation_not_allowed", statusCode: 400 });
  });
});
