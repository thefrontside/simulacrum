import {
  describe,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  expect,
} from "vitest";
import { defaultUser, simulation } from "../src/index.ts";

import { stringify } from "querystring";
import { decode, encode } from "base64-url";
import jwt from "jsonwebtoken";

import Keygrip from "keygrip";
import { removeTrailingSlash } from "../src/handlers/url.ts";
import type { AccessToken, IdToken, TokenSet } from "../src/types.ts";
import { epochTimeToLocalDate } from "../src/auth/date.ts";
import { frontendSimulation } from "./helpers.ts";

const createSessionCookie = <T>(data: T): string => {
  let cookie = Buffer.from(JSON.stringify(data)).toString("base64");

  let kg = Keygrip(["shhh"]);
  let hash = kg.sign(`session=${cookie}`);

  return `session=${cookie};session.sig=${hash};`;
};

let basePort = 4401;
let host = "https://localhost";
let auth0Url = `${host}:${basePort}`;
let person = defaultUser;
let frontendUrl = `http://localhost:3000/login`;

describe("Auth0 simulator", () => {
  let server;
  let frontendServer;
  beforeAll(async () => {
    frontendServer = await frontendSimulation.listen();
    const app = simulation();
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
    await frontendServer.ensureClose();
  });

  describe("/authorize", () => {
    describe("response_mode=query", () => {
      it("has a heartbeat", async () => {
        let res: Response = await fetch(`${auth0Url}/heartbeat`);
        expect(res.ok).toBe(true);
      });

      it("should authorize", async () => {
        let res: Response = await fetch(
          `${auth0Url}/authorize?${stringify({
            client_id: "1234",
            redirect_uri: frontendUrl,
            response_type: "code",
            response_mode: "query",
            state:
              "MVpFN0JXWGNFUVNVQnJjNGlXZWFNbGd2V3M2MC5VRkwyV1VKNW9wRTZVVw==",
            nonce:
              "dDJ6NX5aUFU3SlM4TEozQThyR0V0fjdjRlJDZ0YzfjNDcEV3OWIzWWVYbQ==",
            code_challenge: "2Arx2VYcTp6YDa5r-exGr99upqSIqYZQ_vBbI_7taQ0",
            code_challenge_method: "S256",
            auth0Client:
              "eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xLjAifQ==",
          })}`
        );

        expect(res.redirected).toBe(true);
        expect(res.url).toContain("/login");
      });
    });

    describe("response_mode=web_message", () => {
      it("should return the web_message html", async () => {
        // /authorize web_message expects there to be a username in the session
        let cookie = createSessionCookie({ username: "bob" });

        let res: Response = await fetch(
          `${auth0Url}/authorize?${stringify({
            redirect_uri: frontendUrl,
            response_mode: "web_message",
            state:
              "MVpFN0JXWGNFUVNVQnJjNGlXZWFNbGd2V3M2MC5VRkwyV1VKNW9wRTZVVw==",
            nonce:
              "dDJ6NX5aUFU3SlM4TEozQThyR0V0fjdjRlJDZ0YzfjNDcEV3OWIzWWVYbQ==",
            auth0Client:
              "eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xLjAifQ==",
          })}`,
          {
            credentials: "same-origin",
            headers: {
              cookie,
            },
          }
        );

        expect(res.ok).toBe(true);
        expect(res.headers.get("content-type")).toBe(
          "text/html; charset=utf-8"
        );
      });
    });
  });

  let Fields = {
    audience: "https://thefrontside.auth0.com/api/v1/",
    client_id: "00000000000000000000000000000000",
    connection: "Username-Password-Authentication",
    nonce: "aGV6ODdFZjExbF9iMkdYZHVfQ3lYcDNVSldGRDR6dWdvREQwUms1Z0Ewaw==",
    redirect_uri: "http://localhost:3000",
    response_type: "token id_token",
    scope: "openid profile email offline_access",
    state: "sxmRf2Fq.IMN5SER~wQqbsXl5Hx0JHov",
    tenant: "localhost:4400",
  };

  describe("/login", () => {
    it("should login with valid credentials", async () => {
      let res: Response = await fetch(`${auth0Url}/usernamepassword/login`, {
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

      expect(res.ok).toBe(true);
    });

    it("should fail with invalid credentials", async () => {
      let res: Response = await fetch(`${auth0Url}/usernamepassword/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...Fields,
          username: "bob",
          password: "no-way",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("/login/callback", () => {
    beforeEach(async () => {
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
    });

    it("should post", async () => {
      let fields = encodeURIComponent(
        JSON.stringify({
          ...Fields,
        })
      );

      let res: Response = await fetch(`${auth0Url}/login/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `wctx=${fields}`,
      });

      expect(res.status).toBe(200);
      expect(res.statusText).toBe("OK");
    });

    it(`should redirect to redirect_uri`, async () => {
      let fields = encodeURIComponent(
        JSON.stringify({
          ...Fields,
        })
      );

      let res: Response = await fetch(`${auth0Url}/login/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `wctx=${fields}`,
      });

      expect(res.url.slice(0, Fields.redirect_uri.length)).toBe(
        Fields.redirect_uri
      );
      expect(res.url).toContain(`client_id=${Fields.client_id}`);
      expect(res.url).toContain(
        `audience=${encodeURIComponent(Fields.audience)}`
      );
    });
  });

  describe("/oauth/token", () => {
    let code: string;

    beforeEach(async () => {
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

      code = new URL(res.url).searchParams.get("code") as string;
    });

    describe("valid token", () => {
      let idToken: IdToken;
      let accessToken: AccessToken;
      beforeEach(async () => {
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

        let json = await res.json();

        idToken = jwt.decode(json.id_token, { complete: true }) as IdToken;
        accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;
      });

      it("should return an iss field with a forward slash", () => {
        expect(idToken.payload.iss).toBe(`${auth0Url}/`);
      });

      it("token should contain a valid email", () => {
        expect(idToken.payload.email).toBe(person.email);
      });

      it("sets the access token and id token iat fields in the past", () => {
        expect(
          [accessToken.payload.iat, idToken.payload.iat].every(
            (d) => epochTimeToLocalDate(d) < new Date()
          )
        ).toBe(true);
      });
    });

    it("should return a 401 responsive with invalid credentials", async () => {
      let [nonce] = decode(code).split(":");

      let invalidCode = encode(`${nonce}:invalid-user`);

      let res: Response = await fetch(`${auth0Url}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...Fields,
          code: invalidCode,
        }),
      });

      expect(await res.text()).toBe("Unauthorized");
      expect(res.status).toBe(401);
    });

    describe("grant_type=password", () => {
      let idToken: IdToken;
      let accessToken: AccessToken;
      beforeEach(async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "password",
            username: person.email,
            password: person.password,
            // these are different than the simulator defined values
            // to confirming we can auth and create tokens with the passed values
            client_id: "test-id-to-confirm-it-uses-this",
            audience: "https://thefrontside.auth0.com/api/v0/",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        idToken = jwt.decode(json.id_token, { complete: true }) as IdToken;
        accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;
      });

      it("id_token should contain client_id as aud", () => {
        expect(idToken.payload.aud).toBe("test-id-to-confirm-it-uses-this");
      });

      it("access_token should contain audience as aud", () => {
        expect(accessToken.payload.aud).toBe(
          "https://thefrontside.auth0.com/api/v0/"
        );
      });
    });

    describe("grant_type=client_credentials", () => {
      let accessToken: AccessToken;
      beforeEach(async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            // these are different than the simulator defined values
            // to confirming we can auth and create tokens with the passed values
            client_id: "test-id-to-confirm-it-uses-this",
            audience: "https://thefrontside.auth0.com/api/v0/",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;
      });

      it("access_token should contain audience as aud", () => {
        expect(accessToken.payload.aud).toBe(
          "https://thefrontside.auth0.com/api/v0/"
        );
      });
    });

    describe("grant_type=authorization_code", () => {
      let idToken: IdToken;
      let accessToken: AccessToken;
      beforeEach(async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            code,
            grant_type: "authorization_code",
            // these are different than the simulator defined values
            // to confirming we can auth and create tokens with the passed values
            client_id: "test-id-to-confirm-it-uses-this",
            audience: "https://thefrontside.auth0.com/api/v0/",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        idToken = jwt.decode(json.id_token, { complete: true }) as IdToken;
        accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;
      });

      it("id_token should contain client_id as aud", () => {
        expect(idToken.payload.aud).toBe("test-id-to-confirm-it-uses-this");
      });

      it("access_token should contain audience as aud", () => {
        expect(accessToken.payload.aud).toBe(
          "https://thefrontside.auth0.com/api/v0/"
        );
      });
    });
  });

  describe("m2m token at /oauth/token", () => {
    describe("should return scope", () => {
      let auth0Url = `${host}:${basePort + 1}`;
      let server2;
      beforeAll(async () => {
        const app = simulation({
          options: {
            scope: [
              { clientID: "client-one", scope: "custom:access" },
              { clientID: "client-two", scope: "more-custom:access" },
              {
                clientID: "client-three",
                audience: "https://vip",
                scope: "custom:special-access",
              },
              {
                clientID: "default",
                scope: "openid profile email offline_access",
              },
            ],
          },
        });
        server2 = await app.listen(basePort + 1);
      });

      afterAll(async () => {
        await server2.ensureClose();
      });

      it("based on clientID in req.body", async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            client_id: "client-one",
            audience: "https://thefrontside.auth0.com/api/v0/",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe("custom:access");
      });

      it("based on different clientID in req.body", async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            client_id: "client-two",
            audience: "https://thefrontside.auth0.com/api/v0/",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe("more-custom:access");
      });

      it("based on clientID and specific audience in req.body", async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            client_id: "client-three",
            audience: "https://vip",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe("custom:special-access");
      });

      it("due to fallback scope", async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            client_id: "client-which-expects-the-default",
          }),
        });

        expect(res.ok).toBe(true);

        let json = await res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe(
          "openid profile email offline_access"
        );
      });
    });

    describe("should fail", () => {
      let serverPort = basePort + 2;
      let auth0Url = `${host}:${serverPort}`;
      let server2;
      beforeAll(async () => {
        const app = simulation({
          options: {
            scope: [
              { clientID: "client-one", scope: "custom:access" },
              { clientID: "client-two", scope: "more-custom:access" },
              {
                clientID: "client-three",
                audience: "https://vip",
                scope: "custom:special-access",
              },
            ],
          },
        });
        server2 = await app.listen(serverPort);
      });

      afterAll(async () => {
        await server2.ensureClose();
      });

      it("on missing scope based on clientID", async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            client_id: "non-existent-client",
          }),
        });

        expect(res.ok).toBe(false);

        let text = await res.text();

        expect(text).toBe(
          "Could not find application with clientID: non-existent-client"
        );
      });

      it("on missing scope based on audience", async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: "client_credentials",
            client_id: "client-three",
            audience: "https://bad-audience",
          }),
        });

        expect(res.ok).toBe(false);

        let text = await res.text();

        expect(text).toBe(
          "Found application matching clientID, client-three, but incorrect audience, configured: https://vip :: passed: https://bad-audience"
        );
      });
    });
  });

  describe("/v2/logout", () => {
    it("should authorize", async () => {
      let res: Response = await fetch(
        `${auth0Url}/v2/logout?${stringify({
          returnTo: frontendUrl,
        })}`
      );

      expect(res.redirected).toBe(true);
      expect(removeTrailingSlash(res.url)).toBe(
        removeTrailingSlash(frontendUrl)
      );
    });
  });

  describe("/userinfo", () => {
    let token: TokenSet;
    describe("should retrieve userinfo", () => {
      beforeEach(async () => {
        let res: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            username: person.email,
            password: person.password,
            grant_type: "password",
          }),
        });

        token = await res.json();
      });

      it("should retrieve userinfo from token", async () => {
        let res: Response = await fetch(`${auth0Url}/userinfo`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.access_token}`,
          },
        });

        let user = await res.json();

        expect(user.name).toBe(person.name);
      });

      it("should retrieve userinfo from access_token", async () => {
        let res: Response = await fetch(
          `${auth0Url}/userinfo?access_token=${token.access_token}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        let user = await res.json();

        expect(user.name).toBe(person.name);
      });
    });

    describe("should throw if", () => {
      let globalError = console.error;
      afterEach(() => {
        console.error = globalError;
      });

      it("neither token specified", async () => {
        let resToFail: Response = await fetch(`${auth0Url}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...Fields,
            username: person.email,
            password: person.password,
            grant_type: "password",
          }),
        });

        token = await resToFail.json();

        let res: Response = await fetch(`${auth0Url}/userinfo`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        let responseText = await res.text();

        expect(
          responseText.startsWith(
            "Assert condition failed: no authorization header or access_token"
          )
        ).toBe(true);
        expect(res.status).toBe(500);
      });
    });
  });
});
