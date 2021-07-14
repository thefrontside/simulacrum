import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createTestServer, Client, Simulation } from './helpers';
import { auth0 } from '../src';
import fetch from 'cross-fetch';
import { JWKS } from '../src/auth/constants';

describe('openid routes', () => {
  let client: Client;
  let auth0Url: string;

  beforeEach(function*() {
    client = yield createTestServer({
      simulators: {
        auth0
      }
    });
  });

  describe('/.well-known/*', () => {
    beforeEach(function*() {
      let simulation: Simulation = yield client.createSimulation("auth0");

      auth0Url = simulation.services[0].url;
    });

    it('returns the JWKS keys', function *() {
      let res: Response = yield fetch(`${auth0Url}/.well-known/jwks.json`);

      let json: typeof JWKS = yield res.json();

      expect(res.ok).toBe(true);

      expect(json).toEqual(JWKS);
    });

    it('returns the openid configuration', function * () {
      let res: Response = yield fetch(`${auth0Url}/.well-known/openid-configuration`);

      let json: { token_endpoint: string } = yield res.json();

      expect(res.ok).toBe(true);

      expect(json.token_endpoint).toContain('/oauth/token');
    });
  });
});
