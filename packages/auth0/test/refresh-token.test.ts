import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { defaultUser, simulation } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { issueRefreshToken } from "../src/auth/refresh-token.ts";
import { frontendSimulation } from "./helpers.ts";
import { assert } from "assert-ts";
import { decode } from "base64-url";
import querystring from "querystring";

let Fields = {
  audience: "https://example.nl",
  client_id: "00000000000000000000000000000000",
  connection: "Username-Password-Authentication",
  nonce: "aGV6ODdFZjExbF9iMkdYZHVfQ3lYcDNVSldGRDR6dWdvREQwUms1Z0Ewaw==",
  redirect_uri: "http://localhost:3000",
  response_type: "token id_token",
  scope: "openid profile email offline_access",
  state: "sxmRf2Fq.IMN5SER~wQqbsXl5Hx0JHov",
  tenant: "localhost:4400",
};

let basePort = 4410;
let host = "https://localhost";
let auth0Url = `${host}:${basePort}`;
async function createSimulation() {
  const app = simulation();
  let server = await app.listen(basePort);

  let person = defaultUser;

  // prime the server with the nonce field
  await fetch(`${auth0Url}/usernamepassword/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...Fields,
      username: person.email,
      password: person.password,
    }),
  });

  let res: Response = await fetch(`${auth0Url}/login/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `wctx=${encodeURIComponent(
      JSON.stringify({
        ...Fields,
      })
    )}`,
  });

  let code = new URL(res.url).searchParams.get("code") as string;

  return { code, server };
}

describe("refresh token", () => {
  describe("issueRefreshToken", () => {
    it("should issue with grant_type refresh_token", () => {
      expect(issueRefreshToken("offline_access", "authorization_code")).toBe(
        true
      );
    });

    it("should not issue with no refresh_token grant_type", () => {
      expect(issueRefreshToken("", "authorization_code")).toBe(false);
    });
  });

  describe("get refresh token", () => {
    let code: string;
    let server: FoundationSimulatorListening<unknown>;
    let frontendServer: FoundationSimulatorListening<unknown>;

    beforeAll(async () => {
      frontendServer = await frontendSimulation.listen();
      ({ code, server } = await createSimulation());
    });
    afterAll(async () => {
      await server.ensureClose();
      await frontendServer.ensureClose();
    });

    it("should get access token from refresh token", async () => {
      let res: Response = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...Fields,
          code,
        }),
      });

      const token = (await res.json()) as unknown as { refresh_token: string };

      let refreshToken = JSON.parse(decode(token.refresh_token));

      assert(!!refreshToken, `no refresh token`);

      expect(typeof refreshToken.user.id).toBe("string");

      res = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: querystring.stringify({
          grant_type: "refresh_token",
          client_id: "00000000000000000000000000000000",
          refresh_token: token.refresh_token,
        }),
      });

      const result = (await res.json()) as unknown as {
        access_token: string;
        id_token: string;
        refresh_token: string;
      };

      expect(typeof result.access_token).toBe("string");
      expect(typeof result.id_token).toBe("string");
      expect(typeof result.refresh_token).toBe("string");
    });
  });
});
