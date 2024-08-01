import { createSchema, createYoga } from "graphql-yoga";
import { createResolvers } from "./resolvers";
import type { ServerInstance } from "./types";
import path from "path";
import fs from "fs";
import type { ExtendedSimulationStore } from "../store";

function getSchema(): string {
  let root =
    path.dirname(path.join("..", "..", "..")) === "dist"
      ? path.join(__dirname, "..", "..", "..", "..")
      : path.join(__dirname, "..", "..");

  return fs.readFileSync(
    path.join(root, "schema", "schema.docs-enterprise.graphql"),
    "utf-8"
  );
}

export function createHandler(
  simulationStore: ExtendedSimulationStore
): ServerInstance {
  let schema = getSchema();
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
