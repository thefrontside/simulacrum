#!/usr/bin/env node
import { sleep } from "effection";
import { useServiceGraph } from "../../src/services.ts";
import { httpServer } from "../services/http-server.ts";
import { simulationCLI } from "../../src/cli.ts";

const servicesMap = {
  fast: { operation: httpServer({ startDelay: 10 }) },
  slow: { operation: httpServer({ startDelay: 100 }) },
  dependent: {
    deps: ["fast", "slow"] as const,
    operation: (function* () {
      console.log(
        "dependent: all deps started; running dependent logic (operation)"
      );
      yield* sleep(50);
    })(),
  },
};

export const services = useServiceGraph(servicesMap);

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services());
}

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 300);
    console.log(`Concurrency example (operation) complete`);
  })();
}
