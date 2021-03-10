import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';

import { createClient, Client, Simulation } from "@simulacrum/client";

import { spawnServer, Server } from '../src';

describe("@simulacrum/server", () => {
  let client: Client;
  let server: Server;

  beforeEach(function*(world) {
    server = yield spawnServer(world, {
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

    beforeEach(function*() {
      simulation = yield client.createSimulation("echo");
    });

    // it.skip('has a ping pong service', () => {
    //   expect(simulation.services.pingpong).toBeDefined();
    // });
  });


  it('starts', function*() {
    expect(typeof server.port).toBe('number');
  });
})
