import { v4 } from 'uuid';
import { SimulationState, ScenarioState, ServerState } from "../interfaces";
import { OperationContext } from "./context";
import { createQueue } from '../queue';

import { assert } from 'assert-ts';

export interface Resolver<Args, Result> {
  resolve(args: Args, context: OperationContext): Promise<Result>;
}

export interface Subscriber<Args, TEach, Result = TEach> {
  subscribe(args: Args, context: OperationContext): AsyncIterable<TEach>;
  resolve?(each: TEach): Result;
}

export interface CreateSimulationParameters {
  simulator: string;
}

export const createSimulation: Resolver<CreateSimulationParameters, SimulationState> = {
  resolve({ simulator }, ctx) {
    let { atom, scope, newid } = ctx;

    let id = newid();
    let simulation = atom.slice("simulations").slice(id);
    simulation.set({ id, status: 'new', simulator, scenarios: {}, store: {} });

    return scope.spawn(simulation.filter(({ status }) => status !== 'new').expect());
  }
};

export const destroySimulation: Resolver<{ id: string; }, boolean> = {
  async resolve({ id }, { atom }) {
    let simulation = atom.slice("simulations").slice(id);
    if (simulation.get()) {
      simulation.remove();
      return true;
    } else {
      return false;
    }
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

    return scope.spawn(scenario.filter(({ status }) => status !== 'new').expect());
  }
};

interface StateParameters {
  path: string
}

export const state: Subscriber<StateParameters, ServerState> = {
  subscribe(_args, { scope, atom }) {
    let queue = createQueue<ServerState>();
    scope.spawn(atom.forEach(queue.push));
    return {
      [Symbol.asyncIterator]: () => ({
        async next(): Promise<IteratorResult<ServerState>> {
          let value = await queue.pop();
          return {
            done: false,
            value
          };
        }
      })
    };
  }
};
