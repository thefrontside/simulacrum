import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { simulation } from "../src/index.ts";
import type { FoundationSimulatorListening } from "@simulacrum/foundation-simulator";
import { decodeJwt } from "jose";
import { assert } from "assert-ts";
import { frontendSimulation } from "./helpers.ts";

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

type FixtureDirectories =
  | "user"
  | "access-token"
  | "user-dependent"
  | "async-only"
  | "sync-wrapper-with-async";

type Fixtures = `test/fixtures/rules-${FixtureDirectories}`;
let person = {
  name: "Paul Waters",
  email: "paulwaters.white@yahoo.com",
  password: "12345",
};

let basePort = 4420;
let host = "https://localhost";
let auth0Url = `${host}:${basePort}`;
async function createSimulation(rulesDirectory: Fixtures, initialPerson?: Partial<typeof person>) {
  const frontendServer = await frontendSimulation.listen();

  const simulationPerson = { ...person, ...initialPerson };
  const app = simulation({
    initialState: {
      users: [simulationPerson],
    },
    options: { rulesDirectory },
    extend: {
      extendRouter(router) {
        router.get("/frontside", (_req, res) => {
          res.send(
            "<!DOCTYPE html><html><head><title>frontside</title></head><body></body></html>",
          );
        });
        router.get("/effection", (_req, res) => {
          res.send(
            "<!DOCTYPE html><html><head><title>effection</title></head><body></body></html>",
          );
        });
      },
    },
  });
  let server = await app.listen(basePort);

  // prime the server with the nonce field
  await fetch(`${auth0Url}/usernamepassword/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...Fields,
      username: simulationPerson.email,
      password: simulationPerson.password,
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
      }),
    )}`,
  });

  let code = new URL(res.url).searchParams.get("code") as string;

  await frontendServer.ensureClose();
  return { code, server };
}

describe("rules", () => {
  describe("accessToken claims", () => {
    let code: string;
    let server: FoundationSimulatorListening<unknown>;

    beforeEach(async ({ task: _task }) => {
      ({ code, server } = await createSimulation("test/fixtures/rules-access-token"));
    });
    afterEach(async () => {
      await server.ensureClose();
    });

    it("should have added the claims", async () => {
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

      expect(res.ok).toBe(true);
      let token = (await res.json()) as unknown as { access_token: string };

      const accessToken = decodeJwt(token.access_token);

      assert(!!accessToken);

      console.log(accessToken);
      expect(accessToken["https://example.nl/roles"]).toEqual(["example"]);

      expect(accessToken["https://example.nl/email"]).toEqual("paulwaters.white@yahoo.com");
    });
  });

  describe("augment user", () => {
    let code: string;
    let server: FoundationSimulatorListening<unknown>;

    beforeEach(async () => {
      ({ code, server } = await createSimulation("test/fixtures/rules-user"));
    });
    afterEach(async () => {
      await server.ensureClose();
    });

    it("should have added a picture to the payload", async () => {
      let res: Response = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...Fields,
          code,
          ...person,
        }),
      });

      let token = (await res.json()) as unknown as { id_token: string };

      let idToken = decodeJwt(token.id_token);

      expect(idToken.picture).toContain("https://i.pravatar.cc");
      expect(idToken.name).toBe(person.name);
    });
  });

  describe("rely on user data", () => {
    it("should trust Fred", async () => {
      const otherPerson = {
        name: "Fred Waters",
        email: "fred@yahoo.com",
      };

      let { code, server } = await createSimulation(
        "test/fixtures/rules-user-dependent",
        otherPerson,
      );

      let res: Response = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...Fields,
          code,
          ...otherPerson,
        }),
      });

      const token = (await res.json()) as unknown as { id_token: string };

      let idToken = decodeJwt(token.id_token);
      expect(idToken.name).toBe(otherPerson.name);
      expect(idToken.trustProfile).toContain("friend");
      await server.ensureClose();
    });

    it("should distrust Mark", async () => {
      const otherPerson = {
        name: "Mark Wahl",
        email: "mark@yahoo.com",
      };
      let { code, server } = await createSimulation(
        "test/fixtures/rules-user-dependent",
        otherPerson,
      );

      let res: Response = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...Fields,
          code,
          ...otherPerson,
        }),
      });

      const token = (await res.json()) as unknown as { id_token: string };

      let idToken = decodeJwt(token.id_token);
      expect(idToken.name).toBe(otherPerson.name);
      expect(idToken.trustProfile).toContain("foe");
      await server.ensureClose();
    });
  });

  describe("async rule resolution", () => {
    // nested describe give it an extra task for time to actually release the port
    describe("async top level", () => {
      it("should resolve async top level", async () => {
        let { code, server } = await createSimulation("test/fixtures/rules-async-only", person);
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            code,
            ...person,
          }),
        });

        const token = (await res.json()) as unknown as { id_token: string };

        const idToken = decodeJwt(token.id_token);
        expect(idToken.name).toBe(person.name);

        expect(idToken?.checkURLOne).toBe(`${auth0Url}/frontside`);
        expect(idToken?.checkURLOneStatus).toBe(200);
        expect(idToken?.checkURLOneText).toBe("frontside");
        expect(idToken?.checkURLTwo).toBe(`${auth0Url}/effection`);
        expect(idToken?.checkURLTwoStatus).toBe(200);
        expect(idToken?.checkURLTwoText).toBe("effection");
        await server.ensureClose();
      }, 15000);
    });

    describe("sync top level", () => {
      it("should resolve async nested in sync wrapper", async () => {
        let { code, server } = await createSimulation(
          "test/fixtures/rules-sync-wrapper-with-async",
        );
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            code,
            ...person,
          }),
        });

        const token = (await res.json()) as unknown as { id_token: string };

        const idToken = decodeJwt(token.id_token);
        expect(idToken.name).toBe(person.name);

        expect(idToken?.checkURLOne).toBe(`${auth0Url}/frontside`);
        expect(idToken?.checkURLOneStatus).toBe(200);
        expect(idToken?.checkURLOneText).toBe("frontside");

        expect(idToken?.checkURLTwo).toBe(`${auth0Url}/effection`);
        expect(idToken?.checkURLTwoStatus).toBe(200);
        expect(idToken?.checkURLTwoText).toBe("effection");
        await server.ensureClose();
      }, 15000);
    });
  });
});
