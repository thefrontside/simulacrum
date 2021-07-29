import { createHttpApp, Service, Simulator } from '@simulacrum/server';
import { json } from 'express';

import { playground, graphql as graphQLHandler } from './handlers';
import { Options, SimulatorOptions } from './types';

export function createGraphQLService(options: Options): Service {
  return {
    protocol: 'https',
    app: createHttpApp()
      .use(json())
      .get("/", playground())
      .post("/", graphQLHandler(options)),
  };
}

export function createGraphQLSimulator({ schema, scenarios,createContext, effects }: SimulatorOptions): Simulator {
  return (state) => {
    let store = state.slice('store');

    return {
      services: {
        graphql: createGraphQLService({
          schema,
          context: createContext?.(store),
        })
      },
      scenarios,
      effects,
    };
  };
}
