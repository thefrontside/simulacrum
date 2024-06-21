import { createFoundationSimulationServer } from "../../src/index";
import { openapi } from "./openapi";
import { extendStore } from "./store";
import { extendRouter } from "./extend-api";

export const simulation = createFoundationSimulationServer({
  port: 9999,
  openapi,
  extendStore,
  extendRouter,
});
