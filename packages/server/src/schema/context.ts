import { createSimulation, spawnHttpServer } from '../server';
import { Simulation, Simulator } from '../interfaces';
import { assert } from 'assert-ts';
import { Task } from 'effection';
import express, { raw } from 'express';

export class SimulationContext {
  simulations: Record<string, Simulation> = {};
  constructor(private scope: Task, private availableSimulators: Record<string, Simulator>) {}

  async createSimulation(simulators: string | string[], id?: string): Promise<SimulationRecord> {
    let { scope, simulations, availableSimulators } = this;
    return await scope.spawn(function*() {
      if(typeof id !== 'undefined' && !!simulations[id]) {
        let existing = simulations[id];

        yield existing.scope.halt();
      }

      simulators = Array.isArray(simulators) ? simulators : [simulators];

      // TODO if id is supplied we should check for an existing simulation and return it
      let simulation = createSimulation(scope.spawn(), id);

      for(let sim of simulators) {
        let simulator = simulation.simulators[sim] = availableSimulators[sim];

        assert(!!simulator, `no available simulator for ${sim}`);

        simulation = simulation.addSimulator(sim, simulator);
      }

      simulations[simulation.id] = simulation;

      let services = yield Promise.all(simulation.services.map(async (service) => {
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

        let { port } = await spawnHttpServer(simulation.scope, app);

        return {
          name: service.name,
          url: `http://localhost:${port}`
        };
      }));

      return {
        id: simulation.id,
        services
      };
    });
  }
}

export interface SimulationRecord {
  id: string;
  services: {name: string, url: string}[];
}
