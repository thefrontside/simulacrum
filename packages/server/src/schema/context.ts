import type { Slice } from '@effection/atom';
import type { Task } from 'effection';
import type { ServerState, SimulationOptions, SimulationState } from '../interfaces';

export interface OperationContext {
  scope: Task;
  atom: Slice<ServerState>;
  createSimulation(
    simulator: string,
    options: SimulationOptions,
    debug: boolean): Promise<SimulationState>;
  destroySimulation(id: string): Promise<boolean>;
  newid(): string;
}
