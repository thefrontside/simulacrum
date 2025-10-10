import {
  createFoundationSimulationServer,
  type FoundationSimulator,
} from "../../src/index.ts";
import { openapi } from "./openapi.ts";
import { extendStore, type ExtendedSimulationStore } from "./store.ts";
import { extendRouter } from "./extend-api.ts";
import type {
  ExtendedSchema,
  ExtendActions,
  ExtendSelectors,
  ExtendTasks,
} from "./store.ts";

export function simulation(): FoundationSimulator<ExtendedSimulationStore> {
  return createFoundationSimulationServer({
    port: 9999,
    serveJsonFiles: `${import.meta.dirname}/jsonFiles`,
    openapi,
    extendStore,
    extendRouter,
  })();
}
