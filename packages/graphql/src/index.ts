import { createHttpApp, Scenarios, Service, Simulator } from '@simulacrum/server';
import { json } from 'express';
import { GraphQLSchema } from 'graphql';

import { playground, graphql as graphQLHandler } from './handlers';
import { ContextCreator, DynamicImport, GraphQLOptions, Options } from './types';

function dynamicImport<TExport>(options: DynamicImport) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let result = require(options.module)[options.export] as TExport;

  if (!result) {
    console.warn(`export not found: "${JSON.stringify(options)}"`);
  }

  return result;
}

export function createGraphQLService(options: GraphQLOptions): Service {
  return {
    protocol: 'https',
    app: createHttpApp()
      .use(json())
      .get("/", playground())
      .post("/", graphQLHandler(options)),
  };
}

export const graphql: Simulator<Options> = (state, options) => {
  let store = state.slice('store');

  return {
    services: {
      graphql: createGraphQLService({
        schema: dynamicImport<GraphQLSchema>(options.schema),
        context: dynamicImport<ContextCreator<unknown>>(options.context)(store),
      })
    },
    scenarios: dynamicImport<Scenarios>(options.scenarios)
  };
};
