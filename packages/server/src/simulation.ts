import type { Operation, Task } from 'effection';
import { label, spawn } from 'effection';
import { assert } from 'assert-ts';
import type { Effect } from './effect';
import { map } from './effect';
import express, { raw } from 'express';
import type { ResourceServiceCreator, Service, ServiceCreator, SimulationState, Simulator } from './interfaces';
import type { Server } from './http';
import { createServer } from './http';
import { createFaker } from './faker';
import { middlewareHandlerIsOperation, isRequestHandler } from './guards/guards';
import type { Slice } from '@effection/atom';

function normalizeServiceCreator(service: ServiceCreator): ResourceServiceCreator {
  if(typeof service === 'function') {
    return service;
  }

  return function resource(slice, options) {
    return {
      *init(scope) {
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
            // if the scope is already shutting down or shut down
            // just ignore this request.
            if (scope.state === 'running') {
              scope.run(function*() {
                yield label({ name: 'request', method: handler.method, path: handler.path });

                try {
                  yield handler.handler(request, response);
                } catch(err) {

                  response.status(500);
                  response.write('server error');
                } finally {
                  response.end();
                }
              });
            }
          });
        }

        let port = options.port ?? service.port;

        let server: Server = yield createServer(app, { protocol: service.protocol, port });

        return {
          port: server.address.port,
          protocol: service.protocol
        };
      }
    };
  };
}

export function createSimulation (slice: Slice<SimulationState>, simulators: Record<string, Simulator>): Operation<Task<void>> {
  return spawn(function* () {
    try {
      yield function * errorBoundary() {
        let simulatorName = slice.get().simulator;

        yield label({ name: 'simulation', simulator: simulatorName });

        let simulator = simulators[simulatorName];
        let store = slice.slice("store");

        assert(simulator, `unknown simulator ${simulatorName}`);

        let { options = {}, services: serviceOptions = {} } = slice.get().options;

        let behaviors = simulator(slice, options);

        let servers = Object.entries(behaviors.services).map(([name, service]) => {
          return {
            name,
            create: normalizeServiceCreator(service)
          };
        });

        let services: {name: string; url: string; }[] = [];

        for (let { name, create } of servers) {
          let service: Service = yield create(slice, serviceOptions[name] ?? {});

          services.push({ name, url: `${service.protocol}://localhost:${service.port}` });
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
              error: error as Error
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
      };
    } catch (error) {
      slice.update((state) => ({
        ...state,
        status: "failed",
        error: error as Error,
        services: []
      }));
    }
  });
}

export function simulation(simulators: Record<string, Simulator>): Effect<SimulationState> {
  return function* (slice) {
    let simulationTask = yield createSimulation(slice, simulators);
    yield slice.filter(({ status }) => status == "destroying").expect();
    yield simulationTask.halt();
    slice.slice("status").set("halted");
  };
}
