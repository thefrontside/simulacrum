import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import { ExtendedSimulationStore, extendStore } from "./store/index";
import { extendRouter } from "./graphql/extend-api";
import { openapi } from "./rest/index";

export type GitHubSimulator = FoundationSimulator<ExtendedSimulationStore>;

export const simulation: GitHubSimulator = createFoundationSimulationServer({
  port: 3300, // default port
  extendStore,
  extendRouter,
  openapi,
});
