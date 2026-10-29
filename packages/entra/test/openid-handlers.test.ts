import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { simulation } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { JWKS } from "../src/auth/constants.ts";

let basePort = 4410;
let host = "https://localhost";
let tenant = "0e8a3b8a-0000-4000-a000-0000000000ab";
let baseUrl = `${host}:${basePort}`;
let authority = `${baseUrl}/${tenant}`;

describe("entra openid metadata", () => {
  let server: FoundationSimulatorListening<unknown>;
  beforeAll(async () => {
    const app = simulation();
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  it("serves the JWKS keys", async () => {
    let res = await fetch(`${authority}/discovery/v2.0/keys`);
    let json = await res.json();
    expect(res.ok).toBe(true);
    expect(json).toEqual(JWKS);
  });

  it("serves the openid-configuration with a consistent, self-referential issuer", async () => {
    let res = await fetch(`${authority}/v2.0/.well-known/openid-configuration`);
    let json = (await res.json()) as Record<string, string>;

    expect(res.ok).toBe(true);
    expect(json.issuer).toBe(`${authority}/v2.0`);
    expect(json.authorization_endpoint).toBe(`${authority}/oauth2/v2.0/authorize`);
    expect(json.token_endpoint).toBe(`${authority}/oauth2/v2.0/token`);
    expect(json.jwks_uri).toBe(`${authority}/discovery/v2.0/keys`);
    expect(json.end_session_endpoint).toBe(`${authority}/oauth2/v2.0/logout`);
    expect(json.userinfo_endpoint).toBe(`${baseUrl}/oidc/userinfo`);
  });

  it("serves AAD instance discovery so MSAL accepts the custom authority", async () => {
    let res = await fetch(`${baseUrl}/common/discovery/instance`);
    let json = (await res.json()) as {
      tenant_discovery_endpoint: string;
      metadata: { aliases: string[] }[];
    };

    expect(res.ok).toBe(true);
    expect(json.tenant_discovery_endpoint).toContain("/.well-known/openid-configuration");
    expect(json.metadata[0]?.aliases).toContain(`localhost:${basePort}`);
  });
});
