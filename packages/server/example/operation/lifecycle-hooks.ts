#!/usr/bin/env node
import { sleep } from "effection";
import { useServiceGraph } from "../../src/services.ts";
import { httpServer } from "../services/http-server.ts";
import { simulationCLI } from "../../src/cli.ts";

export const services = {
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
    deps: ["provider"],
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

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    console.log(`Starting lifecycle hooks example (operation)`);
    yield* useServiceGraph(services as any);
    yield* sleep(opts.duration ?? 150);
    console.log(`Lifecycle example (operation) complete`);
  })();
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services as any);
}
