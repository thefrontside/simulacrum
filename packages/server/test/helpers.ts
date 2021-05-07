import { createClient, Client } from '@simulacrum/client';
import { Resource, Task } from 'effection';
import { ServerOptions } from '../src/interfaces';
import { createSimulationServer, Server } from '../src/server';
import WS from 'ws';

export function createTestServer(options: ServerOptions): Resource<Client> {
  return {
    *init(scope: Task) {
      let server: Server = yield createSimulationServer(options);
      let { port } = server.address;
      let client = createClient(`http://localhost:${port}`, WS);
      scope.spawn(function*() {
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
