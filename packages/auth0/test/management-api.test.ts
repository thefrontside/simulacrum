import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { simulation } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { decodeJwt } from "jose";

let basePort = 4430;
let auth0Url = `https://localhost:${basePort}`;
let clientId = "00000000000000000000000000000000";

let seeded = {
  id: "auth0|seeded",
  name: "Seeded",
  email: "seeded@example.com",
  password: "seeded-pw",
  app_metadata: { organisation_id: "org_1" },
};

describe("Management API", () => {
  let server: FoundationSimulatorListening<unknown>;
  let token: string;

  let api = (path: string, init: { method?: string; body?: unknown; token?: string } = {}) =>
    fetch(`${auth0Url}/api/v2${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${init.token ?? token}`,
      },
      ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
    });

  let login = (username: string, password: string) =>
    fetch(`${auth0Url}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "password", client_id: clientId, username, password }),
    });

  let createUser = async (body: Record<string, unknown>) => {
    let res = await api("/users", { method: "POST", body });
    expect(res.status).toBe(201);
    return (await res.json()) as Record<string, any>;
  };

  beforeAll(async () => {
    server = await simulation({
      initialState: { users: [seeded] },
      options: { rulesDirectory: "test/fixtures/rules-metadata" },
    }).listen(basePort);

    let res = await fetch(`${auth0Url}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: "x",
        audience: `${auth0Url}/api/v2/`,
      }),
    });
    token = ((await res.json()) as { access_token: string }).access_token;
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  describe("authentication", () => {
    it("rejects a request without a bearer token", async () => {
      let res = await fetch(`${auth0Url}/api/v2/users/${encodeURIComponent(seeded.id)}`);
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ statusCode: 401, error: "Unauthorized" });
    });

    it("rejects a simulator token for another audience", async () => {
      let res = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId }),
      });
      let { access_token } = (await res.json()) as { access_token: string };

      let apiRes = await api(`/users/${encodeURIComponent(seeded.id)}`, { token: access_token });
      expect(apiRes.status).toBe(401);
    });

    it("rejects a token the simulator did not sign", async () => {
      let res = await api(`/users/${encodeURIComponent(seeded.id)}`, { token: "not.a.jwt" });
      expect(res.status).toBe(401);
    });
  });

  describe("users", () => {
    it("creates a user in the store that can then log in", async () => {
      let user = await createUser({
        email: "New.User@example.com",
        password: "pw-1",
        connection: "Username-Password-Authentication",
        user_metadata: { theme: "dark" },
      });

      expect(user.user_id).toMatch(/^auth0\|/);
      expect(user.email).toBe("new.user@example.com");
      expect(user.email_verified).toBe(false);
      expect(user.user_metadata).toEqual({ theme: "dark" });
      expect(user.app_metadata).toEqual({});
      expect(user).not.toHaveProperty("password");

      let res = await login("new.user@example.com", "pw-1");
      expect(res.status).toBe(200);
      let { id_token } = (await res.json()) as { id_token: string };
      expect(decodeJwt(id_token).sub).toBe(user.user_id);
    });

    it("does not give a user created without a password a guessable one", async () => {
      await createUser({ email: "no-password@example.com" });
      expect((await login("no-password@example.com", "12345")).status).toBe(401);
    });

    it("prefixes a caller-supplied user_id", async () => {
      let user = await createUser({ email: "custom-id@example.com", user_id: "custom-1" });
      expect(user.user_id).toBe("auth0|custom-1");
    });

    it("answers 409 for an email that is already taken", async () => {
      let res = await api("/users", { method: "POST", body: { email: "SEEDED@example.com" } });
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({
        statusCode: 409,
        message: "The user already exists.",
      });
    });

    it("answers 400 for a missing or invalid email", async () => {
      expect((await api("/users", { method: "POST", body: {} })).status).toBe(400);
      expect((await api("/users", { method: "POST", body: { email: "nope" } })).status).toBe(400);
    });

    it("gets a user by id and by email", async () => {
      let res = await api(`/users/${encodeURIComponent(seeded.id)}`);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ user_id: seeded.id, email: seeded.email });

      res = await api(`/users-by-email?email=${encodeURIComponent("Seeded@Example.com")}`);
      expect(await res.json()).toMatchObject([{ user_id: seeded.id }]);

      res = await api(`/users-by-email?email=nobody%40example.com`);
      expect(await res.json()).toEqual([]);

      res = await api(`/users/${encodeURIComponent("auth0|missing")}`);
      expect(res.status).toBe(404);
    });

    it("merges metadata at the top level and deletes keys set to null", async () => {
      let user = await createUser({
        email: "merge@example.com",
        user_metadata: { a: 1, b: { nested: true }, c: 3 },
      });

      let res = await api(`/users/${encodeURIComponent(user.user_id)}`, {
        method: "PATCH",
        body: { name: "Merged", user_metadata: { b: { replaced: true }, c: null, d: 4 } },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        name: "Merged",
        user_metadata: { a: 1, b: { replaced: true }, d: 4 },
      });
    });

    it("shows a metadata update in the next token, including for seeded users", async () => {
      let claim = async () => {
        let res = await login(seeded.email, seeded.password);
        let { access_token } = (await res.json()) as { access_token: string };
        return decodeJwt(access_token)["https://example.nl/org"];
      };

      expect(await claim()).toBe("org_1");

      let res = await api(`/users/${encodeURIComponent(seeded.id)}`, {
        method: "PATCH",
        body: { app_metadata: { organisation_id: "org_2" } },
      });
      expect(res.status).toBe(200);

      expect(await claim()).toBe("org_2");
    });

    it("refuses to patch in an invalid email", async () => {
      let res = await api(`/users/${encodeURIComponent(seeded.id)}`, {
        method: "PATCH",
        body: { email: "nope" },
      });
      expect(res.status).toBe(400);
    });

    it("refuses to patch in another user's email, but accepts the user's own", async () => {
      let user = await createUser({ email: "taken@example.com" });

      let res = await api(`/users/${encodeURIComponent(seeded.id)}`, {
        method: "PATCH",
        body: { email: "Taken@example.com" },
      });
      expect(res.status).toBe(409);

      res = await api(`/users/${encodeURIComponent(user.user_id)}`, {
        method: "PATCH",
        body: { email: "TAKEN@example.com" },
      });
      expect(res.status).toBe(200);
    });

    it("answers 404 when patching an unknown user", async () => {
      let res = await api(`/users/${encodeURIComponent("auth0|missing")}`, {
        method: "PATCH",
        body: { name: "x" },
      });
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ message: "The user does not exist." });
    });

    it("deletes a user, which revokes their login", async () => {
      let user = await createUser({ email: "doomed@example.com", password: "pw" });

      let res = await api(`/users/${encodeURIComponent(user.user_id)}`, { method: "DELETE" });
      expect(res.status).toBe(204);

      expect((await login("doomed@example.com", "pw")).status).toBe(401);
      expect((await api(`/users/${encodeURIComponent(user.user_id)}`)).status).toBe(404);
    });
  });

  describe("password-change tickets", () => {
    let createTicket = async (body: Record<string, unknown>) => {
      let res = await api("/tickets/password-change", { method: "POST", body });
      expect(res.status).toBe(201);
      let { ticket } = (await res.json()) as { ticket: string };
      return new URL(ticket);
    };

    let redeem = (ticketUrl: URL, password: string) =>
      fetch(`${auth0Url}/lo/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          ticket: ticketUrl.searchParams.get("ticket")!,
          password,
        }).toString(),
        redirect: "manual",
      });

    it("sets the password through the ticket page, once", async () => {
      let user = await createUser({ email: "invitee@example.com" });
      let ticketUrl = await createTicket({
        user_id: user.user_id,
        mark_email_as_verified: true,
      });

      expect(ticketUrl.pathname).toBe("/lo/reset");
      let page = await fetch(ticketUrl);
      expect(page.status).toBe(200);
      expect(await page.text()).toContain('name="password"');

      expect((await redeem(ticketUrl, "chosen-pw")).status).toBe(200);

      let res = await login("invitee@example.com", "chosen-pw");
      expect(res.status).toBe(200);
      let { id_token } = (await res.json()) as { id_token: string };
      expect(decodeJwt(id_token).email_verified).toBe(true);

      expect((await redeem(ticketUrl, "again")).status).toBe(400);
    });

    it("redirects to result_url after redeeming", async () => {
      let ticketUrl = await createTicket({
        user_id: seeded.id,
        result_url: "https://app.example.com/welcome",
      });

      let res = await redeem(ticketUrl, "new-seeded-pw");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("https://app.example.com/welcome");
    });

    it("refuses an expired ticket", async () => {
      let ticketUrl = await createTicket({ user_id: seeded.id, ttl_sec: 1 });
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect((await fetch(ticketUrl)).status).toBe(400);
      expect((await redeem(ticketUrl, "too-late")).status).toBe(400);
    });

    it("answers 404 for an unknown user", async () => {
      let res = await api("/tickets/password-change", {
        method: "POST",
        body: { user_id: "auth0|missing" },
      });
      expect(res.status).toBe(404);
    });
  });
});
