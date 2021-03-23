import assert from 'assert-ts';
import { Effect } from './effect';
import express, { raw } from 'express';
import { Behaviors, SimulationState, Simulator } from './interfaces';
import { AddressInfo, createServer } from './http';

export function simulation(definitions: Record<string, Simulator>): Effect<SimulationState> {
  return slice => function*(scope) {
    try {
      let selected = slice.get().simulators;
      let behaviors = selectBehaviors(definitions, selected);

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
          server: createServer(app).run(scope)
        };
      });

      let services: {name: string; url: string; }[] = [];
      for (let { name, server, protocol } of servers) {
        let address: AddressInfo = yield server.address();
        services.push({ name, url: `${protocol}://localhost:${address.port}` });
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

function selectBehaviors(simulators: Record<string, Simulator>, selected: string[]): Behaviors {
  return selected.reduce((behaviors, selection) => {
    assert(simulators[selection] != null, `unknown simulator ${selection}`);
    return append(behaviors, simulators[selection]());
  }, { services: {} } as Behaviors);
}

function append(left: Behaviors, right: Behaviors): Behaviors {
  return {
    services: {
      ...left.services,
      ...right.services
    }
  };
}
