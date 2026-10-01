#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { simulationCLI } from "../../src/cli.ts";
import { useSimulation, useServiceGraph } from "../../src/index.ts";

export const services = useServiceGraph(
  {
    child: {
      operation: useSimulation("simulator", "./test/fixtures/init-data-sim.ts"),
    },
  },
  { globalData: { startupDelayMs: 750 } },
);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
