import { main } from '@effection/node';
import { createSimulationServer, Server } from '@simulacrum/server';
import { schema, createSimulationContext, scenarios } from '@simulacrum/graphql-starwars';

import { createGraphQLSimulator } from '.';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: {
      graphql: createGraphQLSimulator({
        schema,
        createContext: createSimulationContext,
        scenarios
      })
    }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(`simulation server running at ${url}`);

  yield;
});
