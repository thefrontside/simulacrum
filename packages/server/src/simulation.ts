import { spawn } from 'effection';
import { assert } from 'assert-ts';
import { Effect, map } from './effect';
import express, { raw } from 'express';
import { SimulationState, Simulator } from './interfaces';
import { createServer, Server } from './http';
import { createFaker } from './faker';
import { middlewareHandlerIsOperation, isRequestHandler } from './guards/guards';

export function simulation(simulators: Record<string, Simulator>): Effect<SimulationState> {
  return slice => function*(scope) {
    try {
      let store = slice.slice("store");
      let simulatorName = slice.get().simulator;
      let simulator = simulators[simulatorName];
      assert(simulator, `unknown simulator ${simulatorName}`);
      let { options = {}, services: serviceOptions = {} } = slice.get().options;

      let behaviors = simulator(slice, options);

      let servers = Object.entries(behaviors.services).map(([name, service]) => {
        let app = express();

        for(let handler of service.app.middleware) {
          if(isRequestHandler(handler)) {
            app.use(handler);

            continue;
          }

          app.use(function(req, res, next) {
            assert(middlewareHandlerIsOperation(handler), 'invalid middleware function');

            scope.run(handler(req, res))
            .then(next)
            .catch(next);
          });
        }

        app.use(raw({ type: "*/*" }));

        for (let handler of service.app.handlers) {
          app[handler.method](handler.path, (request, response) => {
            scope.run(function*() {
              try {
                yield handler.handler(request, response);
              } catch(err) {

                response.status(500);
                response.write('server error');
              } finally {
                response.end();
              }
            });
          });
        }

        let { protocol } = service;

        return {
          name,
          protocol,
          create: createServer(app, { protocol, port: serviceOptions[name]?.port })
        };
      });

      let services: {name: string; url: string; }[] = [];
      for (let { name, protocol, create } of servers) {
        let server: Server = yield create;
        let address = server.address;
        services.push({ name, url: `${protocol}://localhost:${address.port}` });
      }

      let { scenarios, effects } = behaviors;

      // we can support passing a seed to a scenario later, but let's
      // just hard-code it for now.
      let faker = createFaker(2);

      yield spawn(map(slice.slice("scenarios"), slice => function*() {
        try {
          let { name, params } = slice.get();
          let fn = scenarios[name];
          assert(fn, `unknown scenario ${name}`);

          let data = yield fn(store, faker, params);
          slice.update(state => ({
            ...state,
            status: 'running',
            data
          }));
        } catch (error) {
          slice.update(state => ({
            ...state,
            status: 'failed',
            error
          }));
        }
      }));

      if(typeof effects !== 'undefined') {
        yield spawn(effects());
      }

      slice.update(state => ({
        ...state,
        status: 'running',
        services
      }));

      // all spun up, we can just wait.
      yield;
    } catch (error) {
      slice.update((state) => ({
        ...state,
        status: "failed",
        error,
        services: []
      }));
    }
  };
}
