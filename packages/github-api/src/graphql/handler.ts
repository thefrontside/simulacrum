import { createSchema, createYoga, processRegularResult } from "graphql-yoga";
import { isAsyncIterable } from "@graphql-tools/utils";
import { createResolvers } from "./resolvers.ts";
import { getSchema } from "../utils.ts";
import type { ExtendedSimulationStore } from "../store/index.ts";

import { type Plugin } from "graphql-yoga";

// custom media type parser, we handle some and will continue to add support on an as needed basis
//  see https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28#media-types
const customMediaTypeParser: Plugin = {
  onResultProcess({ request, result, setResultProcessor }) {
    const acceptHeader = request.headers.get("accept");
    if (acceptHeader?.includes("application/vnd.github.v3+json") && !isAsyncIterable(result)) {
      setResultProcessor(processRegularResult, "application/json");
    }
  },
};

export function createHandler(simulationStore: ExtendedSimulationStore) {
  let schema = getSchema("schema.docs-enterprise.graphql");
  let resolvers = createResolvers(simulationStore);

  let yoga = createYoga({
    maskedErrors: false,
    schema: createSchema({
      typeDefs: schema,
      resolvers,
    }),
    plugins: [customMediaTypeParser],
  });

  return yoga;
}
