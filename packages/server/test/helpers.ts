import { Operation } from 'effection';
import { GraphQLClient } from 'graphql-request';
import { ServerOptions, Runnable } from '../src/interfaces';
import { createSimulationServer } from '../src/server';

export function createTestServer(options: ServerOptions): Runnable<{ client(): Operation<GraphQLClient>}> {
  return {
    run(scope) {
      let server = createSimulationServer(options).run(scope);

      return {
        client: () => function*() {
          let { port } = yield server.address();
          return new GraphQLClient(`http://localhost:${port}/graphql`, {
            headers: {}
          });
        }
      };
    }
  };
}
