import type { SimulationHandlers } from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore } from "../store";
import { getSchema } from "src/utils";

let document = getSchema("api.github.com.json");

function handlers(
  simulationStore: ExtendedSimulationStore
): SimulationHandlers {
  return {};
}

export const openapi = [
  {
    document,
    handlers,
    apiRoot: "/api/v3",
    additionalOptions: {
      ajvOpts: {
        strictTypes: false,
        allErrors: true,
      },
    },
  },
];
