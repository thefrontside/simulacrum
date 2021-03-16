import type { Slice } from '@effection/atom';
import { once, Task, Deferred } from 'effection';
import express, { Express } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from '../schema/schema';
import { assert } from 'assert-ts';
import { v4 } from 'uuid';
import { Server, ServerOptions, Simulation, HttpApp, Methods, HttpHandler, HttpMethods, Simulator, Behaviors } from '../interfaces';
import { SimulationContext } from '../schema/context';
import getPort from 'get-port';
import { SimulationState } from './atom';

const createAppHandler = (app: HttpApp) => (method: Methods) => (path: string, handler: HttpHandler): HttpApp => {
  return { ...app, handlers: app.handlers.concat({ method, path, handler }) };
};

const createHttpApp = () => {
  let app = {
    handlers: []
  } as unknown as HttpApp;

  let appHandler = createAppHandler(app);

  for(let method of HttpMethods) {
    app[method] = appHandler(method);
  }

  return app;
};

export function createSimulation(scope: Task, id?: string): Simulation {
  // TODO: if id exists, and existing simulation exists then return existing
  let simulation: Simulation = {
    id: id ?? v4(),
    scope,
    serviceInstances: {},
    services: [],
    addSimulator(name: string, simulator: Simulator): Simulation {
      let behavior: Behaviors = {
        services: [],
        https(handler) {
          let app = handler(createHttpApp());

          return { ...behavior, services: behavior.services.concat({ name, protocol: 'https', app }) };
        },
        http(handler) {
          let app = handler(createHttpApp());

          return { ...behavior, services: behavior.services.concat({ name, protocol: 'http', app }) };
        }
      };

      let behaviors = simulator(behavior);

      return { ...simulation, services: simulation.services.concat(behaviors.services) };
    }
  };

  return simulation;
}

export function spawnHttpServer(
  scope: Task,
  app: Express,
  { port = undefined }: { port?: number } = {}
): Promise<Server> {
  let startup = Deferred<Server>();

  scope.spawn(function*() {
    let availablePort = yield getPort({ port });

    let serverListener = () => {
      let address = server.address();

      assert(!!address && typeof address !== 'string', 'unexpected address');

      let { port } = address;

      startup.resolve({
        port,
      });
    };
    let server = app.listen(availablePort, serverListener);

    scope.spawn(function*() {
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

export function spawnSimulationServer(scope: Task, atom: Slice<SimulationState>, { simulators = {}, port = undefined }: ServerOptions): Promise<Server> {
  let context = new SimulationContext(scope, atom, simulators);

  return spawnHttpServer(
    scope,
    express()
      .disable('x-powered-by')
      .use('/graphql', graphqlHTTP({ schema, graphiql: true, context })),
      { port });
}
