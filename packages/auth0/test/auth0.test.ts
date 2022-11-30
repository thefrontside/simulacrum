import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import type { Client, Simulation } from './helpers';
import { createTestServer } from './helpers';
import { auth0 } from '../src';
import fetch from 'cross-fetch';
import { stringify } from 'querystring';
import type { Person } from '@simulacrum/server';
import { createHttpApp, person } from '@simulacrum/server';
import { decode, encode } from 'base64-url';
import jwt from 'jsonwebtoken';

import Keygrip from 'keygrip';
import { removeTrailingSlash } from '../src/handlers/url';
import type { Scenario } from '@simulacrum/client';
import type { AccessToken, IdToken, ScopeConfig, TokenSet } from '../src/types';
import { epochTimeToLocalDate } from '../src/auth/date';

const createSessionCookie = <T>(data: T): string => {
  let cookie = Buffer.from(JSON.stringify(data)).toString('base64');

  let kg = Keygrip(['shhh']);
  let hash = kg.sign(`session=${cookie}`);

  return `session=${cookie};session.sig=${hash};`;
};

describe('Auth0 simulator', () => {
  let client: Client;
  let frontendUrl: string;
  let auth0Url: string;

  beforeEach(function*() {
    client = yield createTestServer({
      debug: true,
      simulators: {
        auth0: (slice, options) => {
          let { services } = auth0(slice, options);

          return {
            services: {
              ...services,
              frontend: {
                protocol: 'http',
                app: createHttpApp().get('/', function * (_, res) {
                  res.status(200).send('ok');
                })
              },

            },
            scenarios: { person }
          };
        }
      }
    });
  });

  describe("Creating a simulation with an Auth0 simulator", () => {
    let simulation: Simulation;
    beforeEach(function*() {
      simulation = yield client.createSimulation("auth0");
    });

    it('starts the simulation', function*() {
      expect(simulation.status).toEqual('running');
    });
  });

  describe('/authorize', () => {
    describe('response_mode=query', () => {
      beforeEach(function*() {
        let simulation: Simulation = yield client.createSimulation("auth0");

        auth0Url = simulation.services[0].url;
        frontendUrl = simulation.services[1].url;
      });

      it('has a heartbeat', function*() {
        let res: Response = yield fetch(`${auth0Url}/heartbeat`);
        expect(res.ok).toBe(true);
      });

      it('should authorize', function *() {
        let res: Response = yield fetch(`${auth0Url}/authorize?${stringify({
          client_id: "1234",
          redirect_uri: frontendUrl,
          response_type: "code",
          response_mode: "query",
          state: "MVpFN0JXWGNFUVNVQnJjNGlXZWFNbGd2V3M2MC5VRkwyV1VKNW9wRTZVVw==",
          nonce: "dDJ6NX5aUFU3SlM4TEozQThyR0V0fjdjRlJDZ0YzfjNDcEV3OWIzWWVYbQ==",
          code_challenge: "2Arx2VYcTp6YDa5r-exGr99upqSIqYZQ_vBbI_7taQ0",
          code_challenge_method: "S256",
          auth0Client: "eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xLjAifQ==",
        })}`);

        expect(res.redirected).toBe(true);
        expect(res.url).toContain('/login');
      });
    });

    describe('response_mode=web_message', () => {
      beforeEach(function*() {
        let simulation: Simulation = yield client.createSimulation("auth0");

        auth0Url = simulation.services[0].url;
        frontendUrl = simulation.services[1].url;
      });

      it('should return the web_message html', function *() {
        // /authorize web_message expects there to be a username in the session
        let cookie = createSessionCookie({ username: 'bob' });

        let res: Response = yield fetch(`${auth0Url}/authorize?${stringify({
          redirect_uri: frontendUrl,
          response_mode: "web_message",
          state: "MVpFN0JXWGNFUVNVQnJjNGlXZWFNbGd2V3M2MC5VRkwyV1VKNW9wRTZVVw==",
          nonce: "dDJ6NX5aUFU3SlM4TEozQThyR0V0fjdjRlJDZ0YzfjNDcEV3OWIzWWVYbQ==",
          auth0Client: "eyJuYW1lIjoiYXV0aDAtcmVhY3QiLCJ2ZXJzaW9uIjoiMS4xLjAifQ==",
        })}`, {
          credentials: 'same-origin',
          headers: {
            cookie
          }
        });

        expect(res.ok).toBe(true);
        expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
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

  describe('/login', () => {
    let simulation: Simulation;
    let person: {data: Person};
    let url: string;

    beforeEach(function* () {
      simulation = yield client.createSimulation("auth0");
      url = simulation.services[0].url;

      person = yield client.given(simulation, "person");
    });

    it('should login with valid credentials', function*() {
      let res: Response = yield fetch(`${url}/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: person.data.email,
          password: person.data.password,
        })
      });

      expect(res.ok).toBe(true);
    });

    it('should fail with invalid credentials', function*(){
      let res: Response = yield fetch(`${url}/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: 'bob',
          password: 'no-way',
        })
      });

      expect(res.status).toBe(400);
    });
  });

  describe('/login/callback', () => {
    let simulation: Simulation;
    let person: {data: Person};

    beforeEach(function* () {
      simulation = yield client.createSimulation("auth0", {
        services: {
        auth0: { port: 4400 }, frontend: { port: 3000 }
      } });

      person = yield client.given(simulation, "person");

      // prime the server with the nonce field
      yield fetch(`https://localhost:4400/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: person.data.email,
          password: person.data.password,
        })
      });
    });

    it('should post', function* () {
      let fields = encodeURIComponent(JSON.stringify({
        ...Fields
      }));

      let res: Response = yield fetch(`https://localhost:4400/login/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `wctx=${fields}`
      });

      expect(res.status).toBe(200);
      expect(res.statusText).toBe('OK');
    });

    it(`should redirect to redirect_uri`, function* () {
      let fields = encodeURIComponent(JSON.stringify({
        ...Fields
      }));

      let res: Response = yield fetch(`https://localhost:4400/login/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `wctx=${fields}`
      });



      expect(res.url.slice(0, Fields.redirect_uri.length)).toBe(
        Fields.redirect_uri
      );
      expect(res.url).toContain(`client_id=${Fields.client_id}`);
      expect(res.url).toContain(`audience=${encodeURIComponent(Fields.audience)}`);
    });
  });

  describe('/oauth/token', () => {
    let simulation: Simulation;
    let person: {data: Person};
    let authUrl: string;
    let code: string;

    beforeEach(function* () {
      simulation = yield client.createSimulation("auth0", {
        services: {
          auth0: { port: 4400 }, frontend: { port: 3000 }
        }
     });

      person = yield client.given(simulation, "person");

      authUrl = simulation.services[0].url;

      // prime the server with the nonce field
      yield fetch(`${authUrl}/usernamepassword/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          username: person.data.email,
          password: person.data.password,
        })
      });

      let res: Response = yield fetch(`https://localhost:4400/login/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `wctx=${encodeURIComponent(JSON.stringify({
          ...Fields
        }))}`
      });

      code = new URL(res.url).searchParams.get('code') as string;
    });

    describe('valid token', () => {
      let idToken: IdToken;
      let accessToken: AccessToken;
      beforeEach(function * () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...Fields,
            code
          })
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        idToken = jwt.decode(json.id_token, { complete: true }) as IdToken;
        accessToken = jwt.decode(json.access_token, { complete: true }) as AccessToken;
      });

      it('should return an iss field with a forward slash', function* () {
        expect(idToken.payload.iss).toBe('https://localhost:4400/');
      });

      it('token should contain a valid email', function* () {
        expect(idToken.payload.email).toBe(person.data.email);
      });

      it('sets the access token and id token iat fields in the past', function * () {
        expect([accessToken.payload.iat, idToken.payload.iat].every(d => epochTimeToLocalDate(d) < new Date())).toBe(true);
      });
    });

    it('should return a 401 responsive with invalid credentials', function* () {
      let [nonce] = decode(code).split(":");

      let invalidCode = encode(`${nonce}:invalid-user`);

      let res: Response = yield fetch(`${authUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...Fields,
          code: invalidCode
        })
      });

      expect(yield res.text()).toBe('Unauthorized');
      expect(res.status).toBe(401);
    });

    describe('grant_type=password', () => {
      let idToken: IdToken;
      let accessToken: AccessToken;
      beforeEach(function * () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'password',
            username: person.data.email,
            password: person.data.password,
            // these are different than the simulator defined values
            // to confirming we can auth and create tokens with the passed values
            client_id: 'test-id-to-confirm-it-uses-this',
            audience: 'https://thefrontside.auth0.com/api/v0/',
          })
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        idToken = jwt.decode(json.id_token, { complete: true }) as IdToken;
        accessToken = jwt.decode(json.access_token, { complete: true }) as AccessToken;
      });

      it('id_token should contain client_id as aud', function* () {
        expect(idToken.payload.aud).toBe('test-id-to-confirm-it-uses-this');
      });

      it('access_token should contain audience as aud', function* () {
        expect(accessToken.payload.aud).toBe("https://thefrontside.auth0.com/api/v0/");
      });
    });

    describe('grant_type=client_credentials', () => {
      let accessToken: AccessToken;
      beforeEach(function * () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            // these are different than the simulator defined values
            // to confirming we can auth and create tokens with the passed values
            client_id: 'test-id-to-confirm-it-uses-this',
            audience: 'https://thefrontside.auth0.com/api/v0/',
          })
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        accessToken = jwt.decode(json.access_token, { complete: true }) as AccessToken;
      });

      it('access_token should contain audience as aud', function* () {
        expect(accessToken.payload.aud).toBe("https://thefrontside.auth0.com/api/v0/");
      });
    });

    describe('grant_type=authorization_code', () => {
      let idToken: IdToken;
      let accessToken: AccessToken;
      beforeEach(function * () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...Fields,
            code,
            grant_type: 'authorization_code',
            // these are different than the simulator defined values
            // to confirming we can auth and create tokens with the passed values
            client_id: 'test-id-to-confirm-it-uses-this',
            audience: 'https://thefrontside.auth0.com/api/v0/',
          })
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        idToken = jwt.decode(json.id_token, { complete: true }) as IdToken;
        accessToken = jwt.decode(json.access_token, { complete: true }) as AccessToken;
      });

      it('id_token should contain client_id as aud', function* () {
        expect(idToken.payload.aud).toBe('test-id-to-confirm-it-uses-this');
      });

      it('access_token should contain audience as aud', function* () {
        expect(accessToken.payload.aud).toBe("https://thefrontside.auth0.com/api/v0/");
      });
    });
  });

  describe('m2m token at /oauth/token', () => {
    let authUrl: string;
    let createAuth0Simulation = function* ({ scope }: {scope: ScopeConfig}) {
      let simulation: Simulation = yield client.createSimulation('auth0', {
        debug: true,
        options: {
          scope,
        },
        services: {
          auth0: { port: 4400 },
        },
      });

      return simulation.services[0].url;
    };

    describe('should return scope', () => {
      beforeEach(function* () {
        authUrl = yield createAuth0Simulation({
          scope: [
            { clientID: 'client-one', scope: 'custom:access' },
            { clientID: 'client-two', scope: 'more-custom:access' },
            {
              clientID: 'client-three',
              audience: 'https://vip',
              scope: 'custom:special-access',
            },
            {
              clientID: 'default',
              scope: 'openid profile email offline_access',
            },
          ],
        });
      });

      it('based on clientID in req.body', function* () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            client_id: 'client-one',
            audience: 'https://thefrontside.auth0.com/api/v0/',
          }),
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe('custom:access');
      });

      it('based on different clientID in req.body', function* () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            client_id: 'client-two',
            audience: 'https://thefrontside.auth0.com/api/v0/',
          }),
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe('more-custom:access');
      });

      it('based on clientID and specific audience in req.body', function* () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            client_id: 'client-three',
            audience: 'https://vip',
          }),
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe('custom:special-access');
      });

      it('due to fallback scope', function* () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            client_id: 'client-which-expects-the-default',
          }),
        });

        expect(res.ok).toBe(true);

        let json = yield res.json();

        let accessToken = jwt.decode(json.access_token, {
          complete: true,
        }) as AccessToken;

        expect(accessToken.payload.scope).toBe(
          'openid profile email offline_access'
        );
      });
    });

    describe('should fail', () => {
      beforeEach(function* () {
        authUrl = yield createAuth0Simulation({
          scope: [
            { clientID: 'client-one', scope: 'custom:access' },
            { clientID: 'client-two', scope: 'more-custom:access' },
            {
              clientID: 'client-three',
              audience: 'https://vip',
              scope: 'custom:special-access',
            },
          ],
        });
      });

      it('on missing scope based on clientID', function* () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            client_id: 'non-existent-client',
          }),
        });

        expect(res.ok).toBe(false);

        let text = yield res.text();

        expect(text).toBe(
          'Could not find application with clientID: non-existent-client'
        );
      });

      it('on missing scope based on audience', function* () {
        let res: Response = yield fetch(`${authUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            grant_type: 'client_credentials',
            client_id: 'client-three',
            audience: 'https://bad-audience',
          }),
        });

        expect(res.ok).toBe(false);

        let text = yield res.text();

        expect(text).toBe(
          'Found application matching clientID, client-three, but incorrect audience, configured: https://vip :: passed: https://bad-audience'
        );
      });
    });
  });

  describe('/v2/logout', () => {
    beforeEach(function*() {
      let simulation: Simulation = yield client.createSimulation("auth0");

      auth0Url = simulation.services[0].url;
      frontendUrl = simulation.services[1].url;
    });

    it('should authorize', function *() {
      let res: Response = yield fetch(`${auth0Url}/v2/logout?${stringify({
        returnTo: frontendUrl
      })}`);

      expect(res.redirected).toBe(true);
      expect(removeTrailingSlash(res.url)).toBe(removeTrailingSlash(frontendUrl));
    });
  });

  describe('/userinfo', () => {
    let person: Scenario<Person>;
    let token: TokenSet;

    describe('should retrieve userinfo', () => {
      beforeEach(function* () {
        let simulation: Simulation = yield client.createSimulation('auth0');

        auth0Url = simulation.services[0].url;
        frontendUrl = simulation.services[1].url;

        person = yield client.given(simulation, 'person');

        let res: Response = yield fetch(`${auth0Url}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            username: person.data.email,
            password: person.data.password,
            grant_type: 'password',
          }),
        });

        token = yield res.json();
      });

      it('should retrieve userinfo from token', function* () {
        let res: Response = yield fetch(`${auth0Url}/userinfo`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.access_token}`,
          },
        });

        let user = yield res.json();

        expect(user.name).toBe(person.data.name);
      });

      it('should retrieve userinfo from access_token', function* () {
        let res: Response = yield fetch(
          `${auth0Url}/userinfo?access_token=${token.access_token}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        let user = yield res.json();

        expect(user.name).toBe(person.data.name);
      });
    });

    describe('should throw if', () => {
      let globalError = console.error;
      afterEach(() => {
        console.error = globalError;
      });

      it('neither token specified', function* () {
        let simulation: Simulation = yield client.createSimulation('auth0');

        auth0Url = simulation.services[0].url;
        frontendUrl = simulation.services[1].url;

        person = yield client.given(simulation, 'person');

        let resToFail: Response = yield fetch(`${auth0Url}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...Fields,
            username: person.data.email,
            password: person.data.password,
            grant_type: 'password',
          }),
        });

        token = yield resToFail.json();

        let res: Response = yield fetch(`${auth0Url}/userinfo`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let responseText = yield res.text();

        expect(
          responseText.startsWith(
            'Assert condition failed: no authorization header or access_token'
          )
        ).toBe(true);
        expect(res.status).toBe(500);
      });
    });
  });
});
