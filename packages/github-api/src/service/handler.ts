import { createServer } from '@graphql-yoga/node';
import fs from 'fs';
import { createResolvers } from './resolvers';
import type { ServerInstance, SimulatedData } from './types';
import path from 'path';

function getSchema(): string {
  return path(
        process.cwd(),
        'schema',
        'schema.docs-enterprise.graphql',
      );
}

export function createHandler({
  users,
  githubRepositories,
  githubOrganizations,
}: SimulatedData): ServerInstance {
  let schema = getSchema();
  let resolvers = createResolvers({
    users,
    githubRepositories,
    githubOrganizations,
  });

  let graphqlServer = createServer({
    schema: {
      typeDefs: schema,
      resolvers,
    },
    maskedErrors: false,
    logging: {
      debug(..._args) {},
      warn(..._args) {},
      info(..._args) {},
      error(...args) {
        console.error(...args);
      },
    },
  });

  return graphqlServer;
}
