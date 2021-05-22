import assert from 'assert-ts';
import { Effect, map } from './effect';
import express, { raw } from 'express';
import { SimulationState, Simulator } from './interfaces';
import { AddressInfo, createServer, Server } from './http';
import { createFaker } from './faker';

export function simulation(simulators: Record<string, Simulator>): Effect<SimulationState> {
  return slice => function*(scope) {
    try {
      let simulatorName = slice.get().simulator;
      let simulator = simulators[simulatorName];
      assert(simulator, `unknown simulator ${simulatorName}`);
      let options = slice.get().options;

      let behaviors = simulator(options);

      let servers = Object.entries(behaviors.services).map(([name, service]) => {
        let app = express();
        app.use(raw({ type: "*/*" }));
        for (let handler of service.app.handlers) {
          app[handler.method](handler.path, (request, response) => {
            scope.spawn(function*() {
              try {
                yield handler.handler(request, response);
              } catch(err) {
                console.error(err);

                response.status(500);
                response.write('server error');
              } finally {
                response.end();
              }
            });
          });
        }

        return {
          name,
          protocol: service.protocol,
          create: createServer(app)
        };
      });

      let services: {name: string; url: string; }[] = [];
      for (let { name, protocol, create } of servers) {
        let server: Server = yield create;
        let address: AddressInfo = server.address;
        services.push({ name, url: `${protocol}://localhost:${address.port}` });
      }

      let store = slice.slice("store");
      let { scenarios } = behaviors;

      // we can support passing a seed to a scenario later, but let's
      // just hard-code it for now.
      let faker = createFaker(2);

      scope.spawn(map(slice.slice("scenarios"), slice => function*() {
        try {
          let { name } = slice.get();
          let fn = scenarios[name];
          assert(fn, `unknown scenario ${name}`);

          let data = yield fn(store, faker);
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
