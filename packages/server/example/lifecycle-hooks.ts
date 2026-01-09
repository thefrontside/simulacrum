#!/usr/bin/env node
import { sleep, suspend } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useChildSimulation } from "../src/simulation.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
  provider: {
    operation: (function* () {
      yield* useChildSimulation(
        "provider",
        "./example/services/basic-sim.ts",
        [0, 10]
      );
      console.log("provider: afterStart (operation)");
      try {
        yield* suspend();
      } finally {
        console.log("provider: beforeStop (operation)");
      }
    })(),
  },
  consumer: {
    deps: ["provider"] as const,
    operation: (function* () {
      yield* useChildSimulation(
        "consumer",
        "./example/services/basic-sim.ts",
        [0, 10]
      );
      console.log("consumer: afterStart (operation)");
      try {
        yield* suspend();
      } finally {
        console.log("consumer: beforeStop (operation)");
      }
    })(),
  },
};

export const services = useServiceGraph(servicesMap);

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    console.log(`Starting lifecycle hooks example (operation)`);
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 150);
    console.log(`Lifecycle example (operation) complete`);
  })();
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
