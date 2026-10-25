import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { decodeJwt } from "jose";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { simulation } from "../src/index.ts";
import { frontendSimulation } from "./helpers.ts";
import { createActionsRunner, type PostLoginEvent } from "../src/actions/actions-runner.ts";

const event = (overrides: Partial<PostLoginEvent> = {}): PostLoginEvent => ({
  user: {
    user_id: "auth0|alice",
    email: "alice@example.com",
    email_verified: true,
    name: "Alice",
    user_metadata: { organisation_id: "org_123" },
    app_metadata: {},
    identities: [],
  },
  secrets: {},
  request: { query: {}, ip: "127.0.0.1", hostname: "localhost", method: "POST" },
  authorization: { roles: [] },
  resource_server: { identifier: "https://example.nl" },
  stats: { logins_count: 1 },
  client: { client_id: "client" },
  connection: { name: "Username-Password-Authentication", strategy: "auth0" },
  transaction: { protocol: "oidc-basic-profile", requested_scopes: ["openid"] },
  ...overrides,
});

describe("actions runner", () => {
  it("runs nothing when no actions are configured", async () => {
    let result = await createActionsRunner(undefined).postLogin(event());

    expect(result).toEqual({ idTokenClaims: {}, accessTokenClaims: {} });
  });

  it("collects custom claims set from the user's metadata", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.idToken.setCustomClaim("organisation_id", event.user.user_metadata.organisation_id);
          api.accessToken.setCustomClaim("organisation_id", event.user.user_metadata.organisation_id);
        };`,
      },
    ]);

    let result = await runner.postLogin(event());

    expect(result.idTokenClaims).toEqual({ organisation_id: "org_123" });
    expect(result.accessTokenClaims).toEqual({ organisation_id: "org_123" });
  });

  it("gives each action its own secrets", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.idToken.setCustomClaim("first", event.secrets.KEY);
        };`,
        secrets: { KEY: "one" },
      },
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.idToken.setCustomClaim("second", event.secrets.KEY);
        };`,
        secrets: { KEY: "two" },
      },
    ]);

    let result = await runner.postLogin(event());

    expect(result.idTokenClaims).toEqual({ first: "one", second: "two" });
  });

  it("collects metadata updates, removing keys set to null", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.user.setUserMetadata("theme", "dark");
          api.user.setUserMetadata("organisation_id", null);
          api.user.setAppMetadata("roles", ["admin"]);
        };`,
      },
    ]);

    let result = await runner.postLogin(event());

    expect(result.userMetadata).toEqual({ theme: "dark", organisation_id: null });
    expect(result.appMetadata).toEqual({ roles: ["admin"] });
  });

  it("shows metadata updates to later actions without touching the input", async () => {
    let input = event();
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (e, api) => api.user.setUserMetadata("seen", 1);`,
      },
      {
        code: `exports.onExecutePostLogin = async (e, api) =>
          api.idToken.setCustomClaim("seen", e.user.user_metadata.seen);`,
      },
    ]);

    let result = await runner.postLogin(input);

    expect(result.idTokenClaims).toEqual({ seen: 1 });
    expect(input.user.user_metadata).toEqual({ organisation_id: "org_123" });
  });

  it("stops at api.access.deny but keeps the metadata already set", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.user.setUserMetadata("tried", true);
          api.access.deny("not today");
        };`,
      },
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.idToken.setCustomClaim("unreachable", true);
        };`,
      },
    ]);

    let result = await runner.postLogin(event());

    expect(result.denied).toEqual("not today");
    expect(result.idTokenClaims).toEqual({});
    expect(result.userMetadata).toEqual({ tried: true });
  });

  it("stops at a thrown error but keeps the metadata already set", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.user.setUserMetadata("tried", true);
          throw new Error("boom");
        };`,
      },
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.idToken.setCustomClaim("unreachable", true);
        };`,
      },
    ]);

    let result = await runner.postLogin(event());

    expect(result.error).toEqual(new Error("boom"));
    expect(result.idTokenClaims).toEqual({});
    expect(result.userMetadata).toEqual({ tried: true });
  });

  it("ignores registered JWT claims, as Auth0 does", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          api.idToken.setCustomClaim("sub", "someone-else");
          api.accessToken.setCustomClaim("aud", "elsewhere");
          api.accessToken.setCustomClaim("kept", true);
        };`,
      },
    ]);

    let result = await runner.postLogin(event());

    expect(result.idTokenClaims).toEqual({});
    expect(result.accessTokenClaims).toEqual({ kept: true });
  });

  it("keeps an action's cache across executions", async () => {
    let runner = createActionsRunner([
      {
        code: `exports.onExecutePostLogin = async (event, api) => {
          let hits = Number(api.cache.get("hits")?.value ?? 0) + 1;
          api.cache.set("hits", String(hits));
          // a returned record is a copy
          api.cache.get("hits").value = "999";
          api.idToken.setCustomClaim("hits", hits);
        };`,
      },
    ]);

    await runner.postLogin(event());
    let result = await runner.postLogin(event());

    expect(result.idTokenClaims).toEqual({ hits: 2 });
  });

  it("loads an action from a file, with require relative to it", async () => {
    let runner = createActionsRunner([{ file: "test/fixtures/actions/require-sibling.js" }]);

    let result = await runner.postLogin(event());

    expect(result.idTokenClaims).toEqual({ greeting: "hello from a sibling module" });
  });

  it("skips actions that don't handle post-login", async () => {
    let runner = createActionsRunner([
      { code: `exports.onExecuteCredentialsExchange = async () => { throw new Error("no"); };` },
    ]);

    let result = await runner.postLogin(event());

    expect(result.idTokenClaims).toEqual({});
  });

  it("rejects an action configured with both file and code", () => {
    expect(() => createActionsRunner([{ file: "a.js", code: "" }])).toThrow(
      /either `file` or `code`/,
    );
  });
});

describe("post-login actions on /oauth/token", () => {
  let port = 4440;
  let auth0Url = `https://localhost:${port}`;
  let person: {
    id: string;
    name: string;
    email: string;
    password: string;
    user_metadata: Record<string, unknown>;
    email_verified?: boolean;
  } = {
    id: "auth0|alice",
    name: "Alice",
    email: "alice@example.com",
    password: "12345",
    user_metadata: { organisation_id: "org_123" },
  };
  let server: FoundationSimulatorListening<unknown>;

  let token = async (body: Record<string, string>) =>
    fetch(`${auth0Url}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "00000000000000000000000000000000",
        audience: "https://example.nl",
        scope: "openid profile email offline_access",
        ...body,
      }),
    });

  let login = () =>
    token({ grant_type: "password", username: person.email, password: person.password });

  // the authorization code flow, whose nonce the refresh grant requires
  let codeLogin = async (authorizeParams: Record<string, string> = {}) => {
    let frontend = await frontendSimulation.listen();
    try {
      let fields = {
        client_id: "00000000000000000000000000000000",
        audience: "https://example.nl",
        connection: "Username-Password-Authentication",
        nonce: "bm9uY2U=",
        redirect_uri: "http://localhost:3000",
        response_type: "code",
        scope: "openid profile email offline_access",
        state: "state",
        tenant: `localhost:${port}`,
      };
      let { tenant: _, connection: __, ...authorize } = fields;
      await fetch(
        `${auth0Url}/authorize?${new URLSearchParams({ ...authorize, ...authorizeParams })}`,
        {
          redirect: "manual",
        },
      );
      await fetch(`${auth0Url}/usernamepassword/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, username: person.email, password: person.password }),
      });
      let callback = await fetch(`${auth0Url}/login/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `wctx=${encodeURIComponent(JSON.stringify(fields))}`,
      });
      let code = new URL(callback.url).searchParams.get("code") as string;
      return await token({ grant_type: "authorization_code", code });
    } finally {
      await frontend.ensureClose();
    }
  };

  let start = async (file: string, secrets?: Record<string, string>) => {
    server = await simulation({
      initialState: { users: [person] },
      options: { actions: [{ file, secrets }] },
    }).listen(port);
  };

  afterEach(async () => {
    await server.ensureClose();
  });

  describe("claims", () => {
    beforeEach(async () => {
      await start("test/fixtures/actions/claims-from-metadata.js", { NAMESPACE: "https://ns" });
    });

    it("adds the action's claims to both tokens", async () => {
      let res = await login();
      expect(res.ok).toBe(true);
      let { access_token, id_token } = (await res.json()) as Record<string, string>;

      expect(decodeJwt(access_token)["https://ns/organisation_id"]).toBe("org_123");
      expect(decodeJwt(id_token)["https://ns/organisation_id"]).toBe("org_123");
      expect(decodeJwt(id_token)["https://ns/logins"]).toBe(1);
    });

    it("describes the API and request", async () => {
      let { access_token } = (await (await login()).json()) as Record<string, string>;

      expect(decodeJwt(access_token)["https://ns/api"]).toBe("https://example.nl");
      expect(decodeJwt(access_token)["https://ns/roles"]).toEqual([]);
      expect(decodeJwt(access_token)["https://ns/hostname"]).toBe("localhost");
    });

    it("counts overlapping logins", async () => {
      await Promise.all([login(), login()]);
      let { id_token } = (await (await login()).json()) as Record<string, string>;

      expect(decodeJwt(id_token)["https://ns/logins"]).toBe(3);
    });

    it("keeps metadata out of the tokens unless an action adds it", async () => {
      let { access_token, id_token } = (await (await login()).json()) as Record<string, string>;

      for (let claims of [decodeJwt(access_token), decodeJwt(id_token)]) {
        expect(claims).not.toHaveProperty("user_metadata");
        expect(claims).not.toHaveProperty("app_metadata");
      }
    });

    it("runs again on refresh token exchange without counting a login", async () => {
      await login();
      let { refresh_token } = (await (await codeLogin()).json()) as Record<string, string>;

      let res = await token({ grant_type: "refresh_token", refresh_token });
      expect(res.ok).toBe(true);
      let { id_token } = (await res.json()) as Record<string, string>;

      expect(decodeJwt(id_token)["https://ns/organisation_id"]).toBe("org_123");
      expect(decodeJwt(id_token)["https://ns/logins"]).toBe(2);
      expect(decodeJwt(id_token)["https://ns/protocol"]).toBe("oauth2-refresh-token");
    });
  });

  describe("event.request.query", () => {
    beforeEach(async () => {
      await start("test/fixtures/actions/request-query.js");
    });

    it("is the /authorize query for an authorization code login", async () => {
      let res = await codeLogin({ "ext-invitation": "invite-token" });
      expect(res.ok).toBe(true);
      let { id_token } = (await res.json()) as Record<string, string>;

      expect(decodeJwt(id_token).query).toMatchObject({
        "ext-invitation": "invite-token",
        response_type: "code",
      });
    });

    it("is the token request's own query for a password grant", async () => {
      await codeLogin({ "ext-invitation": "invite-token" });
      let { id_token } = (await (await login()).json()) as Record<string, string>;

      expect(decodeJwt(id_token).query).toEqual({});
    });
  });

  describe("metadata updates", () => {
    beforeEach(async () => {
      await start("test/fixtures/actions/count-visits.js");
    });

    it("persists metadata set by an action for the next login", async () => {
      await login();
      let { id_token } = (await (await login()).json()) as Record<string, string>;

      expect(decodeJwt(id_token).visits).toBe(2);
    });
  });

  describe("event.user", () => {
    beforeEach(async () => {
      person.email_verified = false;
      await start("test/fixtures/actions/email-verified.js");
    });
    afterEach(() => {
      delete person.email_verified;
    });

    it("carries the stored email_verified", async () => {
      let { id_token } = (await (await login()).json()) as Record<string, string>;

      expect(decodeJwt(id_token).event_email_verified).toBe(false);
    });
  });

  describe("access.deny", () => {
    beforeEach(async () => {
      await start("test/fixtures/actions/deny.js");
    });

    it("answers with access_denied and the reason", async () => {
      let res = await login();

      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "access_denied",
        error_description: "alice@example.com is not allowed",
      });
    });
  });
});
