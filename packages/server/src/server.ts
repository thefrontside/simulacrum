import { Task } from 'effection';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './schema/schema';
import { v4 } from 'uuid';
import { ServerOptions, Simulation, HttpApp, Methods, HttpHandler, HttpMethods, Simulator, Behaviors } from './interfaces';
import { Runnable, Server, createServer } from './http';
import { SimulationContext } from './schema/context';
import getPort from 'get-port';

export { Server, createServer } from './http';
export type { AddressInfo } from './http';

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
    simulators: {},
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

export function createSimulationServer(options: ServerOptions = { simulators: {} }): Runnable<Server> {
  return {
    run(scope) {
      let context = new SimulationContext(scope, options.simulators);

      let app = express()
        .disable('x-powered-by')
        .use('/graphql', graphqlHTTP({ schema, graphiql: true, context }));

      return createServer(app).run(scope);
    }
  };
}
