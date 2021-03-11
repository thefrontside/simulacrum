import { once, Task, Deferred } from 'effection';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './schema/schema';
import { assert } from 'assert-ts';
import { v4 } from 'uuid';
import { AvailableServers, Server, ServerOptions, Simulation } from './interfaces';
import { SimulationContext } from './schema/context';

export function createSimulation(): Simulation {
  return {
    id: v4(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    http(handler) {
      return this;
    }
  }
}

export function spawnHttpServer(parent: Task, httpServer: AvailableServers): Promise<Server> {
  let startup = Deferred<Server>();

  parent.spawn(function*() {
    let server = httpServer.listen(() => {
      let address = server.address();
      
      assert(!!address && typeof address !== 'string', 'unexpected address');
      
      let { port } = address;
      
      console.log(`server running on  http://localhost:${port}`);
      
      startup.resolve({
        port
      });
    });

    parent.spawn(function*() {
      let error: Error = yield once(server, 'error');
      throw error;
    });

    try {
      yield;
    } finally {
      server.close();
    }
  });

  return startup.promise;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function spawnServer(scope: Task, options: ServerOptions = { simulators: {} }): Promise<Server> {
  let startup = Deferred<Server>();
 
  scope.spawn(function*() {
    let app = express();

    let context = new SimulationContext();

    app.use('/graphql', graphqlHTTP({ schema, graphiql: true, context }));

    let server = yield spawnHttpServer(scope, app);

    console.dir({ server });

    startup.resolve(server);
  });

  return startup.promise;
}
