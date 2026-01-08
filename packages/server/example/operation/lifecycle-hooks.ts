#!/usr/bin/env node
import { sleep } from "effection";
import { useServiceGraph } from "../../src/services.ts";
import { httpServer } from "../services/http-server.ts";
import { simulationCLI } from "../../src/cli.ts";

const servicesMap = {
  provider: {
    operation: httpServer({ startDelay: 10 }),
    afterStart() {
      return (function* () {
        console.log("provider: afterStart (operation)");
      })();
    },
    beforeStop() {
      return (function* () {
        console.log("provider: beforeStop (operation)");
      })();
    },
  },
  consumer: {
    deps: ["provider"] as const,
    operation: httpServer({ startDelay: 10 }),
    afterStart() {
      return (function* () {
        console.log("consumer: afterStart (operation)");
      })();
    },
    beforeStop() {
      return (function* () {
        console.log("consumer: beforeStop (operation)");
      })();
    },
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
