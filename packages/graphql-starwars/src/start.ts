import { main } from '@effection/node';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';

import { schema, createContext } from '.';

const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;

/**
 * Serves the "real" Star Wars schema
 *
 * Use `@simulacrum/graphql/src/start` to run the schema in simulation
 */
main(function*() {
  let app = express();
  app.use('/', graphqlHTTP({
    schema,
    context: createContext(),
    graphiql: true,
  }));
  app.listen(port);

  console.log(`GraphQL server running at http://localhost:${port}`);

  yield;
});
