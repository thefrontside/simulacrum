import { once, Task, Deferred } from 'effection';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './schema/schema';
import { assert } from 'assert-ts';
import { v4 } from 'uuid';
import { HttpServers, Server, ServerOptions, Simulation, HttpServerOptions, SimulationServer, HttpApp, Methods, HttpHandler, HttpMethods, Simulator, Behaviors } from './interfaces';
import { SimulationContext } from './schema/context';

const createAppHandler = (app: HttpApp) => (method: Methods) => (path: string, handler: HttpHandler): HttpApp => {
  return {...app, handlers: app.handlers.concat({ method, path, handler })};
}

const createHttpApp = () => {
  let app = {
    handlers: []
  } as unknown as HttpApp;
  
  let appHandler = createAppHandler(app);
  
  for(let method of HttpMethods) {
    app[method] = appHandler(method);
  }

  return app;
}

export function createSimulation(id?: string): Simulation {
  // TODO: if id exists, and existing simulation exists then return existing
  let simulation: Simulation =  {
    id: id ?? v4(),
    simulators: {},
    services: [],
    addSimulator(name: string, simulator: Simulator): Simulation {
      let behavior: Behaviors = {
        services: [],
        https(handler) {
          let app = handler(createHttpApp());
    
          return { ...behavior, services: behavior.services.concat({ name, protocol: 'https', app  }) };
        },    
        http(handler) {
          let app = handler(createHttpApp());

          return { ...behavior, services: behavior.services.concat({ name, protocol: 'http', app  }) };
        }
      };

      let behaviors = simulator(behavior);

      return { ...simulation, services: simulation.services.concat(behaviors.services) }
    }
  }

  console.dir(simulation);

  return simulation;
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
