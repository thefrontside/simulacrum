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

export const simulation: Auth0Simulator = (args = {}) => {
  // if config is provided, use it.
  // Otherwise, get the config from passed in options and defaults
  const config = args.config ?? getConfig(args.options);
  const parsedInitialState = !args?.initialState
    ? undefined
    : auth0InitialStoreSchema.parse(args?.initialState);
  return createFoundationSimulationServer({
    ...(config.port !== undefined && { port: config.port }),
    ...(config.protocol !== undefined && { protocol: config.protocol }),
    extendStore: extendStore(parsedInitialState, args?.extend?.extendStore),
    extendRouter: extendRouter(config, args.extend?.extendRouter, args.debug),
  })();
};

export { auth0ConfigParser, auth0Program, getConfig, readJsonConfig } from "./config/get-config.ts";
export { auth0UserSchema, defaultUser } from "./store/entities.ts";
