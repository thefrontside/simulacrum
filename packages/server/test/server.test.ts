import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';

import { createClient, Client, Simulation } from "@simulacrum/client";

import type { HttpHandler } from '../src/interfaces';
import { createSimulationServer, AddressInfo } from '../src/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe("@simulacrum/server", () => {
  let client: Client;
  let address: AddressInfo;

  beforeEach(function*(world) {
    let server = createSimulationServer({
      simulators: {
        echo({ http }) {
          return http(app => app.get('/', echo));
        },
      }
    }).run(world);
    address = yield server.address();
    client = createClient(`http://localhost:${address.port}`);
  });

  describe.skip('creating a simulation', () => {
    let simulation: Simulation;

    beforeEach(function*() {
      simulation = yield client.createSimulation("echo");
    });

    it('has a echo service', function* () {
      expect(simulation.services.pingpong).toBeDefined();
    });
  });

  it('starts', function*() {
    expect(typeof address.port).toBe('number');
  });
});
