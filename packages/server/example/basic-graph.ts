#!/usr/bin/env node
import { sleep, each, type Stream } from "effection";
import { useService } from "../src/service.ts";
import { useServiceGraph } from "../src/services.ts";
import { simulationCLI } from "../src/cli.ts";

const services = {
  A: {
    operation: useService("A", "node --import tsx ./example/services/a.ts", {
      wellnessCheck: {
        frequency: 10,
        *operation(stdio: Stream<string, void>) {
          for (let line of yield* each<string>(stdio)) {
            if (line.includes("started")) {
              console.log("A ready (wellnessCheck)");
              return { ok: true } as any;
            }
            yield* each.next();
          }
        },
      },
    }),
  },
  B: {
    operation: useService("B", "node --import tsx ./example/services/b.ts", {
      wellnessCheck: {
        frequency: 10,
        *operation(stdio: Stream<string, void>) {
          for (let line of yield* each<string>(stdio)) {
            if (line.includes("started")) {
              console.log("B ready (wellnessCheck)");
              return { ok: true } as any;
            }
            yield* each.next();
          }
        },
      },
    }),
    deps: ["A"],
  },
};

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    yield* useServiceGraph(services as any);
    yield* sleep(opts.duration ?? 300);
    console.log(`Basic example complete`);
  })();
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // run via CLI when executed directly
  simulationCLI(services);
}
