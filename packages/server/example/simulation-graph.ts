#!/usr/bin/env node
import { sleep } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useChildSimulation } from "../src/simulation.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
  A: {
    operation: useChildSimulation(
      "A",
      "./example/services/basic-sim.ts",
      [0, 10]
    ),
  },
  B: {
    deps: ["A"] as const,
    operation: useChildSimulation(
      "B",
      "./example/services/basic-sim.ts",
      [0, 20]
    ),
  },
};

export const services = useServiceGraph(servicesMap);

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 300);
    console.log(`Basic (operation) example complete`);
  })();
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
