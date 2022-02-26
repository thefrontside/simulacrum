import type { Slice } from '@effection/atom';
import type { SimulationOptions } from '@simulacrum/types';
import type { Task } from 'effection';
import type { ServerState, SimulationState } from '../interfaces';

export interface OperationContext<O> {
  scope: Task;
  atom: Slice<ServerState<O>>;
  createSimulation(
    simulator: string,
    options: SimulationOptions<O>,
    debug: boolean): Promise<SimulationState<O>>;
  destroySimulation(id: string): Promise<boolean>;
  newid(): string;
}
