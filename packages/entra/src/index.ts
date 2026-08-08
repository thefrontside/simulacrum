import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore, EntraExtendStoreInput } from "./store/index.ts";
import { extendStore } from "./store/index.ts";
import type { Router } from "express";
import { extendRouter } from "./handlers/index.ts";
import { type EntraInitialStore, entraInitialStoreSchema } from "./store/entities.ts";
import { getConfig } from "./config/get-config.ts";
import { type EntraConfiguration } from "./types.ts";

export type EntraSimulator = (args?: {
  debug?: boolean;
  initialState?: EntraInitialStore;
  extend?: {
    extendStore?: EntraExtendStoreInput;
    extendRouter?: (router: Router, simulationStore: ExtendedSimulationStore) => void;
  };
  options?: Partial<EntraConfiguration>;
}) => FoundationSimulator<ExtendedSimulationStore>;

export const simulation: EntraSimulator = (args = {}) => {
  const config = getConfig(args.options);
  const parsedInitialState = !args?.initialState
    ? undefined
    : entraInitialStoreSchema.parse(args?.initialState);
  return createFoundationSimulationServer({
    port: config.port ?? 4400, // default port
    protocol: "https",
    extendStore: extendStore(parsedInitialState, args?.extend?.extendStore),
    extendRouter: extendRouter(config, args.extend?.extendRouter, args.debug),
  })();
};

export { entraUserSchema, defaultUser } from "./store/entities.ts";
export { getConfig } from "./config/get-config.ts";
export type { EntraConfiguration } from "./types.ts";
export type { EntraInitialStore } from "./store/entities.ts";
