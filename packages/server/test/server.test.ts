import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';

import { createClient, Client, Simulation } from "@simulacrum/client";

import { spawnServer, Server, HttpHandler, Simulator } from '../src';

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

  describe('creating a simulation', () => {
    let simulation: Simulation;

    beforeEach(function*() {
      simulation = yield client.createSimulation("echo");
    });

    it('has a echo pong service', () => {
      expect(simulation.services.pingpong).toBeDefined();
    });
  });


  it('starts', function*() {
    expect(typeof server.port).toBe('number');
  });
});


const echo: HttpHandler = (_request, _response) => Promise.resolve();
