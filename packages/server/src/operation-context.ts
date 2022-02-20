import type { Task } from 'effection';
import type { ServerState, SimulationOptions, SimulationState, Simulator } from './interfaces';
import type { OperationContext } from './schema/context';
import type { v4 } from 'uuid';
import type { Slice } from '@effection/atom';
import { createSimulation } from './simulation';

type NewId = (() => string) | typeof v4;

export function createOperationContext(atom: Slice<ServerState>, scope: Task, newid: NewId, simulators: Record<string, Simulator>): OperationContext {
  let simulationsMap = new Map<string, Task>();

  return {
    atom,
    scope,
    async createSimulation(
      simulator: string,
      options: SimulationOptions,
      debug: boolean
    ): Promise<SimulationState> {
      let simulationId = options.key ?? newid();
      let existing = simulationsMap.get(simulationId);

      if (!!existing) {
        await existing.halt();
      }

      let slice = atom.slice("simulations", simulationId);

      slice.set({
        id:simulationId,
        status: 'new',
        simulator,
        options,
        services: [],
        scenarios: {},
        store: {},
        debug,
      });

      await scope.run(function*() {
        let simulationTask: Task = yield scope.spawn(function* () {
          yield createSimulation(slice, simulators);

          try {
            yield;
          } finally {
            simulationsMap.delete(simulationId);
            slice.remove();
          }
        });

        simulationsMap.set(simulationId, simulationTask);

        yield slice.filter(({ status }) => status === 'running').expect();
      });

      return slice.get();
    },
    async destroySimulation(simulationId: string) {
      let simulation = simulationsMap.get(simulationId);

      if(!simulation) {
        return false;
      }

      await simulation.halt();

      return true;
    },
    newid
  };
}
