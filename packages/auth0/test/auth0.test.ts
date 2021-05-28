import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createTestServer, Client, Simulation } from './helpers';

import { createAuth0Simulator } from '../src';
import { config } from '../src/config';

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
