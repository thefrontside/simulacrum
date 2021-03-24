import { Slice } from '@effection/atom';
import { Task } from 'effection';
import { SimulationState } from '../interfaces';

export class SimulationContext {
  constructor(private scope: Task, private simulations: Slice<Record<string, SimulationState>>, private newid: () => string) {}

  async createSimulation(using: string | string[]): Promise<SimulationState> {
    let simulators = ([] as string[]).concat(using);
    let { scope, simulations, newid } = this;

    let id = newid();
    let simulation = simulations.slice(id);
    simulation.set({ id, status: 'new', simulators });

    return scope.spawn(
      simulation.once(({ status }) => status === 'running' || status === 'failed')
    );
  }
}
