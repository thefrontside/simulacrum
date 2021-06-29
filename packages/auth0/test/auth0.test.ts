import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createTestServer, Client, Simulation } from './helpers';
import { auth0 } from '../src';
import fetch from 'cross-fetch';
import { stringify } from 'querystring';

describe('Auth0 simulator', () => {
  let client: Client;
  beforeEach(function*() {
    client = yield createTestServer({
      simulators: { auth0 }
    });
  });

  describe("Creating a simulation with an Auth0 simulator", () => {
    let simulation: Simulation;
    beforeEach(function*() {
      simulation = yield client.createSimulation("auth0");
    });

    afterEach(function * () {
      if(simulation) {
        client.destroySimulation(simulation);
      }
    });

    it('works', function*() {
      expect(simulation.status).toEqual('running');
    });
  });

  describe('authorize', () => {
    let simulation: Simulation;

    afterEach(function * () {
      if(simulation) {
        client.destroySimulation(simulation);
      }
    });

    beforeEach(function*() {
      simulation = yield client.createSimulation("auth0", { services: {
        auth0: { port: 4400 }
      } });
    });

    it('should authorize', function *() {
      let res: Response = yield fetch(`https://localhost:4400/authorize?${stringify({
        client_id: "1234",
        redirect_uri: "http://localhost:3000",
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
});
