import { Scenarios, Store } from '@simulacrum/server';
import { GraphQLSchema } from 'graphql';

export type ContextCreator<TContext> = (store: Store) => TContext;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Options<TContext = any> {
  schema: GraphQLSchema;
  context: TContext;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SimulatorOptions<TContext = any> {
  schema: GraphQLSchema;
  scenarios: Scenarios;
  createContext?: ContextCreator<TContext>;
}
