import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import type { Client, Simulation } from './helpers';
import { createTestServer } from './helpers';
import { auth0 } from '../src';
import fetch from 'cross-fetch';
import type { Person } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import { person as personScenario } from '@simulacrum/server';
import jwt from 'jsonwebtoken';
import { assert } from 'assert-ts';
import type { Scenario } from '@simulacrum/client';

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

type FixtureDirectories = 'user' | 'access-token';

type Fixtures = `test/fixtures/rules-${FixtureDirectories}`;

function * createSimulation(client: Client, rulesDirectory: Fixtures) {
  let simulation: Simulation = yield client.createSimulation("auth0", {
    options: {
      rulesDirectory
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

describe('rules', () => {
  let client: Client;

  it('should', function * () {
    expect(true).toBe(true);
  });

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

  describe('accessToken claims', () => {
    let authUrl: string;
    let code: string;

    beforeEach(function* () {
      ({ authUrl, code } = yield createSimulation(client, 'test/fixtures/rules-access-token'));
    });

    it('should have added the claims', function* () {
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

      let accessToken = jwt.decode(token.access_token, { complete: true });

      assert(!!accessToken);

      expect(accessToken.payload['https://example.nl/roles']).toEqual(["example"]);

      expect(accessToken.payload['https://example.nl/email']).toEqual('paulwaters.white@yahoo.com');
    });
  });

  describe('augment user', () => {
    let authUrl: string;
    let code: string;

    beforeEach(function* () {
      ({ authUrl, code } = yield createSimulation(client, 'test/fixtures/rules-user'));
    });

    it('should have added a picture to the payload', function* () {
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

      let idToken = jwt.decode(token.id_token, { complete: true });

      expect(idToken?.payload.picture).toContain('https://i.pravatar.cc');
    });
  });
});
