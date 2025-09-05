import {
  createFoundationSimulationServer,
  type SimulationHandlers,
  type FoundationSimulator,
} from "@simulacrum/foundation-simulator";
import { ExtendedSimulationStore, extendStore } from "./store/index.ts";
import { extendRouter } from "./handlers/index.ts";
import {
  type Auth0InitialStore,
  auth0InitialStoreSchema,
} from "./store/entities.ts";
import { getConfig } from "./config/get-config.ts";
import { Auth0Configuration } from "./types.ts";

export type Auth0Simulator = ({
  debug,
  initialState,
  extend,
  options,
}?: {
  debug?: boolean;
  initialState?: Auth0InitialStore;
  extend?: {
    extendStore?: SimulationInput["extendStore"];
    openapiHandlers?: (
      simulationStore: ExtendedSimulationStore
    ) => SimulationHandlers;
    extendRouter?: SimulationInput["extendRouter"];
  };
  options?: Partial<Auth0Configuration>;
}) => FoundationSimulator<ExtendedSimulationStore>;

type SimulationInput = Parameters<typeof createFoundationSimulationServer>[0];
export const simulation: Auth0Simulator = (args = {}) => {
  const config = getConfig(args.options);
  const parsedInitialState = !args?.initialState
    ? undefined
    : auth0InitialStoreSchema.parse(args?.initialState);
  return createFoundationSimulationServer({
    port: 4400, // default port
    protocol: "https",
    extendStore: extendStore(parsedInitialState, args?.extend?.extendStore),
    extendRouter: extendRouter(config, args.debug),
  })();
};

export { auth0UserSchema, defaultUser } from "./store/entities.ts";
