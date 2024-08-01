import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";
import { extendStore } from "./store/index";
import { extendRouter } from "./service/extend-api";

export const simulation = createFoundationSimulationServer({
  port: 3300, // default port
  extendStore,
  extendRouter,
});
