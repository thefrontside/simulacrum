import { Store } from '@simulacrum/server';
import { GraphQLSchema } from 'graphql';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface GraphQLOptions<TContext = any> {
  schema: GraphQLSchema;
  context: TContext;
}

export type ContextCreator<TContext> = (store: Store) => TContext;

export interface DynamicImport {
  module: string;
  export: string;
}

export interface Options {
  schema: DynamicImport;
  context: DynamicImport;
  scenarios: DynamicImport;
}
