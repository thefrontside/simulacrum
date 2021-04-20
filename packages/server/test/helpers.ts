import { createClient, Client } from '@simulacrum/client';
import { Operation } from 'effection';
import { ServerOptions, Runnable } from '../src/interfaces';
import { createSimulationServer } from '../src/server';
import WS from 'ws';

export function createTestServer(options: ServerOptions): Runnable<{ client(): Operation<Client>}> {
  return {
    run(scope) {
      let server = createSimulationServer(options).run(scope);

      return {
        client: () => function*() {
          let { port } = yield server.address();
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
  };
}
