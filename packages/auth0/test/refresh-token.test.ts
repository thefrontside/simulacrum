import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { issueRefreshToken } from '../src/auth/refresh-token';
import type { Client, Simulation } from './helpers';
import { createTestServer } from './helpers';
import { auth0 } from '../src';
import fetch from 'cross-fetch';
import type { Person } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import { person as personScenario } from '@simulacrum/server';
import { assert } from 'assert-ts';
import type { Scenario } from '@simulacrum/client';
import { decode } from 'base64-url';
import querystring from 'querystring';

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

function * createSimulation(client: Client) {
  let simulation: Simulation = yield client.createSimulation("auth0", {
    options: {
    },
    services: {
      auth0: { port: 4400 }, frontend: { port: 3000 }
    }
  });

  let authUrl = simulation.services[0].url;

  let person: Scenario<Person> = yield client.given(simulation, "person");

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

  let code = new URL(res.url).searchParams.get('code') as string;

  return { code, authUrl };
}

describe('refresh token', () => {
  describe('issueRefreshToken', () => {
    it('should issue with grant_type refresh_token', function*() {
      expect(issueRefreshToken('offline_access', 'authorization_code')).toBe(true);

    });

    it('should not issue with no refresh_token grant_type', function*() {
      expect(issueRefreshToken('', 'authorization_code')).toBe(false);
    });
  });

  let client: Client;

  beforeEach(function* () {
    client = yield createTestServer({
      simulators: {
        auth0: (slice, options) => {
          let { services } = auth0(slice, options);

          return {
            services: {
              ...services,
              frontend: {
                protocol: 'http',
                app: createHttpApp().get('/', function* (_, res) {
                  res.status(200).send('ok');
                })
              },
            },
            scenarios: { person: personScenario }
          };
        }
      }
    });
  });

  describe('get refresh token', () => {
    let authUrl: string;
    let code: string;

    beforeEach(function* () {
      ({ authUrl, code } = yield createSimulation(client));
    });

    it('should get access token from refresh token', function* () {
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

      let token = yield res.json();

      let refreshToken = JSON.parse(decode(token.refresh_token));

      assert(!!refreshToken, `no refresh token`);

      expect(typeof refreshToken.user.id).toBe('string');

      res = yield fetch(`${authUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify({
          grant_type: 'refresh_token',
          client_id: "00000000000000000000000000000000",
          refresh_token: token.refresh_token
        })
      });

      let result = yield res.json();

      expect(typeof result.access_token).toBe('string');
      expect(typeof result.id_token).toBe('string');
      expect(typeof result.refresh_token).toBe('string');
    });
  });
});
