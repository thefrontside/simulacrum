import { Slice } from '@effection/atom';
import { Task } from 'effection';
import { v4 } from 'uuid';
import { SimulationState } from '../interfaces';

export class SimulationContext {
  constructor(private scope: Task, private simulations: Slice<Record<string, SimulationState>>) {}

  async createSimulation(using: string | string[], uuid?: string): Promise<SimulationState> {
    let simulators = ([] as string[]).concat(using);
    let { scope, simulations } = this;

    return await scope.spawn(function*() {
      let id = uuid || v4();
      let simulation = simulations.slice(id);
      simulation.set({ id, status: 'new', simulators });
      yield simulation.filter(({ status }) => status === 'running' || status === 'failed').first();
      return simulation.get();
    });
  }
}
