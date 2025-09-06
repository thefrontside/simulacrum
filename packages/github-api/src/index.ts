import {
  createFoundationSimulationServer,
  type SimulationHandlers,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import { ExtendedSimulationStore, extendStore } from "./store/index.ts";
import { extendRouter } from "./extend-api.ts";
import { openapi } from "./rest/index.ts";
import {
  type GitHubInitialStore,
  gitubInitialStoreSchema,
} from "./store/entities.ts";
import type { SchemaFile } from "./utils.ts";

export type GitHubSimulator = ({
  initialState,
  apiUrl,
  apiSchema,
  extend,
}?: {
  initialState?: GitHubInitialStore;
  apiUrl?: string;
  apiSchema?: SchemaFile | string;
  extend?: {
    extendStore?: SimulationInput["extendStore"];
    openapiHandlers?: (
      simulationStore: ExtendedSimulationStore
    ) => SimulationHandlers;
    extendRouter?: SimulationInput["extendRouter"];
  };
}) => FoundationSimulator<ExtendedSimulationStore>;
export type InitialState = GitHubInitialStore;

type SimulationInput = Parameters<typeof createFoundationSimulationServer>[0];
export const simulation: GitHubSimulator = (args = {}) => {
  const parsedInitialState = !args?.initialState
    ? undefined
    : gitubInitialStoreSchema.parse(args?.initialState);
  return createFoundationSimulationServer({
    port: 3300, // default port
    simulationContextPage: "/simulation",
    extendStore: extendStore(parsedInitialState, args?.extend?.extendStore),
    extendRouter,
    openapi: openapi(
      parsedInitialState,
      args?.apiUrl ?? "/",
      args?.apiSchema ?? "api.github.com.json",
      args?.extend?.openapiHandlers
    ),
  })();
};

export {
  githubUserSchema,
  githubOrganizationSchema,
  githubRepositorySchema,
  githubBranchSchema,
  githubBlobSchema,
} from "./store/entities.ts";
