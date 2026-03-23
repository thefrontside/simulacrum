#!/usr/bin/env node
import { useServiceGraph } from "../src/services.ts";
import { useChildSimulation } from "../src/simulation.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
  A: {
    operation: useChildSimulation("A", "./example/services/basic-sim-1.ts"),
  },
  B: {
    dependsOn: { startup: ["A"] as const },
    operation: useChildSimulation("B", "./example/services/basic-sim-2.ts"),
  },
};

export const services = useServiceGraph(servicesMap, {
  globalData: { exampleKey: "exampleValue" },
});

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
