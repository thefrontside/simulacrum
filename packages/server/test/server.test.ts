import { describe, it } from 'mocha';
import expect from 'expect';

import { world, run } from './helpers';

import { createClient, Client, Simulation } from "@simulacrum/client";

import { spawnServer, Server } from '../src';

describe("@simulacrum/server", () => {
  let client: Client;
  let server: Server;

  beforeEach(async () => {
    server = await spawnServer(world, {
      simulators: {
        ping(simulation) {
          simulation.service((request, response) => function*() {
            response.write("pong");
          });
        }
      }
    });
    client = createClient(`http://localhost:${server.port}`);
  });

  describe('creating a simulation', () => {
    let simulation: Simulation;

    beforeEach(async () => {
      simulation = await run(client.createSimulation("ping"));
    });

    it.skip('has a ping pong service', () => {
      expect(simulation.services.pingpong).toBeDefined();
    });
  });


  it('starts', () => {
    expect(typeof server.port).toBe('number');
  });
})
