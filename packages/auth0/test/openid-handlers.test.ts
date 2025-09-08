import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { simulation } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { JWKS } from "../src/auth/constants.ts";

let basePort = 4401;
let host = "https://localhost";
let auth0Url = `${host}:${basePort}`;
describe("openid routes", () => {
  let server: FoundationSimulatorListening<unknown>;
  beforeAll(async () => {
    const app = simulation();
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  describe("/.well-known/*", () => {
    it("returns the JWKS keys", async () => {
      let res: Response = await fetch(`${auth0Url}/.well-known/jwks.json`);

      const json = (await res.json()) as typeof JWKS;

      expect(res.ok).toBe(true);

      expect(json).toEqual(JWKS);
    });

    it("returns the openid configuration", async () => {
      let res: Response = await fetch(
        `${auth0Url}/.well-known/openid-configuration`
      );

      const json = await res.json();

      expect(res.ok).toBe(true);

      expect(json).toEqual({
        issuer: `${auth0Url}/`,
        authorization_endpoint: `${auth0Url}/authorize`,
        token_endpoint: `${auth0Url}/oauth/token`,
        userinfo_endpoint: `${auth0Url}/userinfo`,
        jwks_uri: `${auth0Url}/.well-known/jwks.json`,
      });
    });
  });
});
