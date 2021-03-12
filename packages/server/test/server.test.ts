import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';

import { createClient, Client, Simulation } from "@simulacrum/client";

import type { HttpHandler, SimulationServer } from '../src/interfaces';
import { spawnServer } from '../src/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe("@simulacrum/server", () => {
  let client: Client;
  let server: SimulationServer;

  beforeEach(function*(world) {
    server = yield spawnServer(world, {
      simulators: {
        echo(simulation) {
          return simulation.http(app => app.get('/', echo));
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
      console.dir(simulation)
      expect(simulation.services.pingpong).toBeDefined();
    });
  });


  it('starts', function*() {
    expect(typeof server.port).toBe('number');
  });

  it('adds the available simulators', function * () {
    expect(typeof server.availableSimulators.echo).toBe('function');
  })
});

