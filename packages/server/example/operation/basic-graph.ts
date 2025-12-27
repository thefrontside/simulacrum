#!/usr/bin/env node
import { sleep } from "effection";
import { useServiceGraph } from "../../src/services.ts";
import { httpServer } from "../services/http-server.ts";
import { simulationCLI } from "../../src/cli.ts";

export const services = {
  A: {
    operation: httpServer({ startDelay: 10 }),
  },
  B: {
    deps: ["A"],
    operation: httpServer({ startDelay: 20 }),
  },
};

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    yield* useServiceGraph(services as any);
    yield* sleep(opts.duration ?? 300);
    console.log(`Basic (operation) example complete`);
  })();
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services as any);
}
