import { createSimulation, spawnHttpServer } from '../server/server';
import { ServiceInstance, Simulator } from '../interfaces';
import { assert } from 'assert-ts';
import { Task } from 'effection';
import type { Slice } from '@effection/atom/dist';
import type { SimulationState } from '../server/atom';
import express, { raw } from 'express';
import { v4 } from 'uuid';

export class SimulationContext {
  constructor(private scope: Task, private atom: Slice<SimulationState>, private availableSimulators: Record<string, Simulator>) {}

  async createSimulation(simulators: string | string[], id?: string): Promise<SimulationRecord> {
    let { scope, availableSimulators, atom } = this;

    return await scope.spawn(function*() {
      if(typeof id !== 'undefined') {
        let existing = atom.slice('simulations', id).get();

        yield existing.scope.halt();
      }

      simulators = Array.isArray(simulators) ? simulators : [simulators];

      // TODO if id is supplied we should check for an existing simulation and return it
      let simulation = createSimulation(scope.spawn(), id);


      for(let sim of simulators) {
        let simulator = availableSimulators[sim];

        assert(!!simulator, `no available simulator for ${sim}`);


        simulation = simulation.addSimulator(sim, simulator);
      }

      let services: ServiceInstance[] = yield Promise.all(simulation.services.map(async (service) => {
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
          id: v4(),
          port,
          name: service.name,
          url: `${service.protocol}://localhost:${port}`
        };
      }));

      atom.slice('simulations').update(s => ({
        ...s,
        [simulation.id]: {
          ...simulation,
          serviceInstances: services.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
        }
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
