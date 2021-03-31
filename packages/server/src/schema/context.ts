import { Slice } from '@effection/atom';
import assert from 'assert-ts';
import { Task } from 'effection';
import { v4 } from 'uuid';
import { SimulationState, ScenarioState } from '../interfaces';

export class SimulationContext {
  constructor(private scope: Task, private simulations: Slice<Record<string, SimulationState>>, private newid: () => string) {}

  async createSimulation(using: string | string[]): Promise<SimulationState> {
    let simulators = ([] as string[]).concat(using);
    let { scope, simulations, newid } = this;

    let id = newid();
    let simulation = simulations.slice(id);
    simulation.set({ id, status: 'new', simulators, scenarios: {}, store: {} });

    return scope.spawn(simulation.filter(settled).expect());
  }

  async given(simulationId: string, scenarioName: string): Promise<ScenarioState> {
    let { scope, simulations } = this;
    let simulation = simulations.slice(simulationId);
    assert(simulation.get() != null, `no simulation found with id: ${simulationId}`);

    let id = v4();
    let scenario = simulation.slice('scenarios').slice(id);
    scenario.set({ id, status: 'new', name: scenarioName });

    return scope.spawn(scenario.filter(settled).expect());
  }
}

function settled<T extends { status: 'new' | 'running' | 'failed' }>(value: T): boolean {
  return value.status !== 'new';
}
