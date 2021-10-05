import { v4 } from 'uuid';
import { SimulationState, ScenarioState, ServerState, SimulationOptions } from "../interfaces";
import { OperationContext } from "./context";
import { createQueue } from '../queue';

import { assert } from 'assert-ts';
import { sleep } from '@effection/core';

export interface Resolver<Args, Result> {
  resolve(args: Args, context: OperationContext): Promise<Result>;
}

export interface Subscriber<Args, TEach, Result = TEach> {
  subscribe(args: Args, context: OperationContext): AsyncIterable<TEach>;
  resolve?(each: TEach): Result;
}

export interface CreateSimulationParameters {
  simulator: string;
  options?: SimulationOptions;
}

export const createSimulation: Resolver<CreateSimulationParameters, SimulationState> = {
  async resolve({ simulator, options = {} }, ctx) {
    let { atom, scope, newid } = ctx;

    let id = options.key ?? newid();

    let simulation = atom.slice("simulations", id);

    if(!!simulation.get()) {
      simulation.remove();
    }

    await scope.run(sleep(5));

    simulation.set({
      id,
      status: 'new',
      simulator,
      options,
      services: [],
      scenarios: {},
      store: {},
    });

    return scope.run(simulation.filter(({ status }) => status !== 'new').expect());
  }
};

export const destroySimulation: Resolver<{ id: string; }, boolean> = {
  async resolve({ id }, { atom }) {
    let simulation = atom.slice("simulations", id);
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
  params: Record<string, unknown>;
}

export const given: Resolver<GivenParameters, ScenarioState> = {
  resolve({ simulation: simulationId, a: scenarioName, params }, context) {
    let { scope, atom } = context;
    let simulation = atom.slice("simulations").slice(simulationId);
    assert(simulation.get() != null, `no simulation found with id: ${simulationId}`);

    let id = v4();
    let scenario = simulation.slice('scenarios').slice(id);
    scenario.set({ id, status: 'new', name: scenarioName, params });

    return scope.run(scenario.filter(({ status }) => status !== 'new').expect());
  }
};

interface StateParameters {
  path: string
}

export const state: Subscriber<StateParameters, ServerState> = {
  subscribe(_args, { scope, atom }) {
    let queue = createQueue<ServerState>();
    scope.run(atom.forEach(queue.push));
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
