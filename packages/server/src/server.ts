import { once, Task, Deferred } from 'effection';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './schema/schema';
import { assert } from 'assert-ts';
import { v4 } from 'uuid';
import { HttpServers, Server, ServerOptions, Simulation, HttpServerOptions, SimulationServer, HttpApp, Methods, HttpHandler, HttpMethods } from './interfaces';
import { SimulationContext } from './schema/context';

const createAppHandler = (app: HttpApp) => (method: Methods) => (path: string, handler: HttpHandler) => {
  app.handlers.push({ method, path, handler });

  return app;
}

export function createSimulation(id?: string): Simulation {
  let app = {
    handlers: []
  } as unknown as HttpApp;

  let appHandler = createAppHandler(app);

  for(let method of HttpMethods) {
    app[method] = appHandler(method);
  }

  return {
    id: id ?? v4(),
    http(handler) {
      handler(app);

      return this;
    }
  }
}

export function spawnHttpServer(
  parent: Task,
  httpServer: HttpServers,
  { onClose = () => undefined }: HttpServerOptions = {}
): Promise<Server> {
  let startup = Deferred<Server>();

  parent.spawn(function*() {
    let server = httpServer.listen(() => {
      let address = server.address();
      
      assert(!!address && typeof address !== 'string', 'unexpected address');
      
      let { port } = address;

      startup.resolve({
        port,
      });
    });
    
    parent.spawn(function*() {
      let error: Error = yield once(server, 'error');
      throw error;
    });

    try {
      yield;
    } finally {
      server.close(onClose);
    }
  });
  
  return startup.promise;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function spawnServer(scope: Task, options: ServerOptions = { simulators: {} }): Promise<SimulationServer> {
  let startup = Deferred<SimulationServer>();
  
  scope.spawn(function*() {
    let app = express();
    
    app.disable('x-powered-by');
    
    let context = new SimulationContext(options.simulators);
    
    app.use('/graphql', graphqlHTTP({ schema, graphiql: true, context }));
    
    let server: SimulationServer = yield spawnHttpServer(scope, app, {
      onClose: () => console.log('simulation server shut down')
    });

    server.availableSimulators = options.simulators;
    
    console.log(`Simulation server running on http://localhost:${server.port}/graphql`);

    startup.resolve(server);
  });

  return startup.promise;
}
