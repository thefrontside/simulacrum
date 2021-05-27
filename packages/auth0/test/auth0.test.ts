import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createTestServer, Client, Simulation } from './helpers';

import { Auth0Options, createAuth0Simulator} from '../src';

const config: Auth0Options = {
  scope: 'openid profile email offline_access',
  port: 4400,
  audience: "https://thefrontside.auth0.com/api/v1/",
  tenant: "frontside",
  clientId: 'IsuLUyWaFczCbAKQrIpVPmyBTFs4g5iq',
};


describe('Auth0 simulator', () => {
  let client: Client;
  beforeEach(function*() {
    client = yield createTestServer({
      simulators: { auth0: createAuth0Simulator(config) }
    });
  });

  describe("Creating a simulation with an Auth0 simulator", () => {
    let simulation: Simulation;
    beforeEach(function*() {
      simulation = yield client.createSimulation("auth0");
    });

    it('works', function*() {
      expect(simulation.status).toEqual('running');
    });
  });
});
