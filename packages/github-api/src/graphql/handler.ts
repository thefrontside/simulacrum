import { createSchema, createYoga } from "graphql-yoga";
import { createResolvers } from "./resolvers";
import { getSchema } from "../utils";
import type { ExtendedSimulationStore } from "../store";

export function createHandler(simulationStore: ExtendedSimulationStore) {
  let schema = getSchema("schema.docs-enterprise.graphql");
  let resolvers = createResolvers(simulationStore);

  let yoga = createYoga({
    maskedErrors: false,
    schema: createSchema({
      typeDefs: schema,
      resolvers,
    }),
  });

  return yoga;
}
