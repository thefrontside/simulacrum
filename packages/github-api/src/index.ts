import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import { ExtendedSimulationStore, extendStore } from "./store/index";
import { extendRouter } from "./extend-api";
import { openapi } from "./rest/index";

export type GitHubSimulator = (
  initialState?: any
) => ReturnType<FoundationSimulator<ExtendedSimulationStore>>;

export const simulation: GitHubSimulator = (initialState = {}) =>
  createFoundationSimulationServer({
    port: 3300, // default port
    extendStore: extendStore(initialState),
    extendRouter,
    openapi: openapi(initialState),
  })();
