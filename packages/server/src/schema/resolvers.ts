import { v4 } from 'uuid';
import type { SimulationState, ScenarioState, ServerState, SimulationOptions } from "../interfaces";
import type { OperationContext } from "./context";
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
  options?: SimulationOptions;
  debug?: boolean;
}

export const createSimulation: Resolver<CreateSimulationParameters, SimulationState> = {
  async resolve(args, ctx) {
    let { simulator, options = {}, debug = false } = args;

    return await ctx.createSimulation(simulator, options, debug);
  }
};

export const destroySimulation: Resolver<{ id: string }, boolean> = {
  async resolve({ id }, { destroySimulation }) {
    return await destroySimulation(id);
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
