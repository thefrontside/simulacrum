import { createFoundationSimulationServer } from "../../src/index.ts";
import { openapi } from "./openapi.ts";
import { extendStore } from "./store.ts";
import { extendRouter } from "./extend-api.ts";

export const simulation = createFoundationSimulationServer({
  port: 9999,
  serveJsonFiles: `${import.meta.dirname}/jsonFiles`,
  openapi,
  extendStore,
  extendRouter,
});
