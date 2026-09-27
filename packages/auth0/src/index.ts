import {
  createFoundationSimulationServer,
  type SimulationHandlers,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore } from "./store/index.ts";
import { extendStore } from "./store/index.ts";
import type { Router } from "express";
import type { Auth0ExtendStoreInput } from "./store/index.ts";
import { extendRouter } from "./handlers/index.ts";
import { type Auth0InitialStore, auth0InitialStoreSchema } from "./store/entities.ts";
import { getConfig } from "./config/get-config.ts";
import { type Auth0Configuration } from "./types.ts";

export type Auth0Simulator = (args?: {
  debug?: boolean;
  initialState?: Auth0InitialStore;
  extend?: {
    extendStore?: Auth0ExtendStoreInput;
    openapiHandlers?: (simulationStore: ExtendedSimulationStore) => SimulationHandlers;
    extendRouter?: (router: Router, simulationStore: ExtendedSimulationStore) => void;
  };
  options?: Partial<Auth0Configuration>;
  config?: Auth0Configuration;
}) => FoundationSimulator<ExtendedSimulationStore>;

export const simulation: Auth0Simulator = ({
  debug,
  initialState,
  extend,
  options,
  config: suppliedConfig,
} = {}) => {
  // if config is provided, use it.
  // Otherwise, get the config from passed in options and defaults
  const config = suppliedConfig ?? getConfig(options);
  const parsedInitialState = initialState === undefined
    ? undefined
    : auth0InitialStoreSchema.parse(initialState);
  return createFoundationSimulationServer({
    ...(config.port !== undefined && { port: config.port }),
    ...(config.protocol !== undefined && { protocol: config.protocol }),
    extendStore: extendStore(parsedInitialState, extend?.extendStore),
    extendRouter: extendRouter(config, extend?.extendRouter, debug),
  })();
};

export {
  auth0App,
  getCLIConfig,
  getConfig,
  readJsonConfig,
  type CLIConfigResult,
} from "./config/get-config.ts";
export { auth0UserSchema, defaultUser } from "./store/entities.ts";
