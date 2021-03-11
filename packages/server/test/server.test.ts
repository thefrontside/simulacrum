import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';

import { createClient, Client, Simulation } from "@simulacrum/client";

import type { Server, HttpHandler } from '../src/interfaces';
import { spawnServer } from '../src/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe("@simulacrum/server", () => {
  let client: Client;
  let server: Server;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    it('has a echo pong service', (): any => {
      console.dir(simulation)
      expect(simulation.services.pingpong).toBeDefined();
    });
  });


  it('starts', function*() {
    expect(typeof server.port).toBe('number');
  });
});

