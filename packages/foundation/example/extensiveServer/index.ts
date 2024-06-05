import { startFoundationSimulationServer } from "../../src";
import { openapi } from "./openapi";
import { extendStore } from "./store";
import { extendRouter } from "./extend-api";

startFoundationSimulationServer({
  port: 9999,
  openapi,
  extendStore,
  extendRouter,
});
