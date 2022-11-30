import { createServer } from '@graphql-yoga/node';
import { createResolvers } from './resolvers';
import type { ServerInstance, SimulatedData } from './types';
import path from 'path';

function getSchema(): string {
  return path.join(
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      debug(..._args) {},
      warn(...args) {
        console.dir(...args);
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      info(..._args) {},
      error(...args) {
        console.error(...args);
      },
    },
  });

  return graphqlServer;
}
