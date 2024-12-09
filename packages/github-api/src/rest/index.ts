import type { SimulationHandlers } from "@simulacrum/foundation-simulator";
import type { ExtendedSimulationStore } from "../store";
// import fetch from "node-fetch";
import githubAPI from "../../schema/api.github.com.json";

let document = [githubAPI];

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
