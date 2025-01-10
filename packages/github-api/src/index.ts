import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import { ExtendedSimulationStore, extendStore } from "./store/index";
import { extendRouter } from "./extend-api";
import { openapi } from "./rest/index";
import {
  type GitHubInitialStore,
  gitubInitialStoreSchema,
} from "./store/entities";

export type GitHubSimulator = (
  initialState?: GitHubInitialStore
) => ReturnType<FoundationSimulator<ExtendedSimulationStore>>;

export const simulation: GitHubSimulator = (initialState) => {
  const parsedInitialState = !initialState
    ? undefined
    : gitubInitialStoreSchema.parse(initialState);
  return createFoundationSimulationServer({
    port: 3300, // default port
    extendStore: extendStore(parsedInitialState),
    extendRouter,
    openapi: openapi(parsedInitialState),
  })();
};

export {
  githubUserSchema,
  githubOrganizationSchema,
  githubRepositorySchema,
  githubBlobSchema,
} from "./store/entities";
