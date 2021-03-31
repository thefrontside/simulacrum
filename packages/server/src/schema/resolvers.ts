import { SimulationState, ScenarioState } from "../interfaces";
import { OperationContext } from "./context";
import { v4 } from 'uuid';

import { assert } from 'assert-ts';

export interface Resolver<Args, Result> {
  resolve(args: Args, context: OperationContext): Promise<Result>;
}

export interface CreateSimulationParameters {
  simulators: string[];
}

export const createSimulation: Resolver<CreateSimulationParameters, SimulationState> = {
  resolve({ simulators }, ctx) {
    let { atom, scope, newid } = ctx;

    let id = newid();
    let simulation = atom.slice("simulations").slice(id);
    simulation.set({ id, status: 'new', simulators, scenarios: {}, store: {} });

    return scope.spawn(simulation.filter(settled).expect());
  }
};

export interface GivenParameters {
  a: string;
  simulation: string;
}

export const given: Resolver<GivenParameters, ScenarioState> = {
  resolve({ simulation: simulationId, a: scenarioName }, context) {
    let { scope, atom } = context;
    let simulation = atom.slice("simulations").slice(simulationId);
    assert(simulation.get() != null, `no simulation found with id: ${simulationId}`);

    let id = v4();
    let scenario = simulation.slice('scenarios').slice(id);
    scenario.set({ id, status: 'new', name: scenarioName });

    return scope.spawn(scenario.filter(settled).expect());
  }
};

function settled<T extends { status: 'new' | 'running' | 'failed' }>(value: T): boolean {
  return value.status !== 'new';
}
