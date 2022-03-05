import { v4 } from 'uuid';
import type { SimulationState, ScenarioState, ServerState } from "../interfaces";
import type { OperationContext } from "./context";
import { createQueue } from '../queue';
import { assert } from 'assert-ts';
import type { SimulationOptions } from '@simulacrum/types';

type GetOptions<T> = T extends SimulationState<infer O> ? O : never;

export interface Resolver<Args, Result> {
  resolve(args: Args, context: OperationContext<GetOptions<Result>>): Promise<Result>;
}

export interface CreateSimulationParameters<O = unknown> {
  simulator: string;
  options?: SimulationOptions<O>;
  debug?: boolean;
}

export function createSimulation<O>(): Resolver<CreateSimulationParameters, SimulationState<O>> {
  return {
    async resolve(args, ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { simulator, options = {} as any, debug = false } = args;

      return await ctx.createSimulation(simulator, options, debug);
    }
  };
}

export function destroySimulation(): Resolver<{ id: string }, boolean> {
  return {
    async resolve({ id }, { destroySimulation }) {
      return await destroySimulation(id);
    }
  };
}

export interface GivenParameters {
  a: string;
  simulation: string;
  params: Record<string, unknown>;
}

export function given(): Resolver<GivenParameters, ScenarioState> {
  return {
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
}

interface StateParameters {
  path: string
}

export interface Subscriber<O, Args, TEach, Result = TEach> {
  subscribe(args: Args, context: OperationContext<O>): AsyncIterable<TEach>;
  resolve?(each: TEach): Result;
}

export function state<O>(): Subscriber<O, StateParameters, ServerState<O>> {
  return {
    subscribe(_args, { scope, atom }) {
      let queue = createQueue<ServerState<O>>();
      scope.run(atom.forEach(queue.push));
      return {
        [Symbol.asyncIterator]: () => ({
          async next(): Promise<IteratorResult<ServerState<O>>> {
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
}
