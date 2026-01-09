#!/usr/bin/env node
import { resource, sleep } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useChildSimulation } from "../src/simulation.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
  fast: {
    operation: useChildSimulation("fast", "./example/services/basic-sim-1.ts"),
    watch: ["./example/services/basic-sim-1.ts"],
  },
  slow: {
    operation: useChildSimulation("slow", "./example/services/basic-sim-2.ts"),
    watch: ["./example/services/basic-sim-2.ts"],
  },
  dependent: {
    // deps: ["fast", "slow"] as const,
    operation: resource<void>(function* (provide) {
      try {
        console.log("all deps started; running dependent service");
        yield* provide();
      } finally {
        console.log("stopping dependent service");
      }
    }),
    watch: ["./example/services/basic-sim.ts"],
  },
};

export const services = useServiceGraph(servicesMap);

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 300);
    console.log(`Concurrency example (operation) complete`);
  })();
}
