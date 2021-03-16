import type { Slice } from '@effection/atom';
import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';

import { createClient, Client, Simulation } from "@simulacrum/client";

import type { HttpHandler, Server } from '../src/interfaces';
import { spawnSimulationServer } from '../src/server/server';
import { createSimulationAtom, SimulationState } from '../src/server/atom';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe("@simulacrum/server", () => {
  let client: Client;
  let server: Server;
  let atom: Slice<SimulationState>;

  beforeEach(function*(world) {
    atom = createSimulationAtom();

    server = yield spawnSimulationServer(world, atom, {
      simulators: {
        echo({ http }) {
          return http(app => app.get('/', echo));
        },
      }
    });
    client = createClient(`http://localhost:${server.port}`);
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
    expect(typeof server.port).toBe('number');
  });
});
