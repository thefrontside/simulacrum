import { Task, Resource } from 'effection';
import { createClient, Client } from '@simulacrum/client';
import { Server, ServerOptions, createSimulationServer } from '@simulacrum/server';

export type { Client, Simulation } from '@simulacrum/client';

export function createTestServer(options: ServerOptions): Resource<Client> {
  return {
    *init(scope: Task) {
      let server: Server = yield createSimulationServer(options);
      let { port } = server.address;
      let client = createClient(`http://localhost:${port}`);
      scope.run(function*() {
        try {
          yield;
        } finally {
          client.dispose();
        }
      });
      return client;
    }
  };
}
