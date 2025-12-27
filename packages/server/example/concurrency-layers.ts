#!/usr/bin/env node
import { sleep, each, type Stream } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useService } from "../src/service.ts";
import { simulationCLI } from "../src/cli.ts";

const services = {
  fast: {
    operation: useService(
      "fast",
      "node --import tsx ./example/services/fast.ts",
      {
        wellnessCheck: {
          frequency: 10,
          *operation(stdio: Stream<string, void>) {
            for (let line of yield* each<string>(stdio)) {
              if (line.includes("started")) {
                console.log("fast ready");
                return { ok: true } as any;
              }
              yield* each.next();
            }
          },
        },
      }
    ),
  },
  slow: {
    operation: useService(
      "slow",
      "node --import tsx ./example/services/slow.ts",
      {
        wellnessCheck: {
          frequency: 10,
          *operation(stdio: Stream<string, void>) {
            for (let line of yield* each<string>(stdio)) {
              if (line.includes("started")) {
                console.log("slow ready");
                return { ok: true } as any;
              }
              yield* each.next();
            }
          },
        },
      }
    ),
  },
  dependent: {
    deps: ["fast", "slow"],
    operation: (function* () {
      console.log("dependent: all deps started; running dependent logic");
      yield* sleep(50);
    })(),
  },
};

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services as any);
}

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    yield* useServiceGraph(services as any);
    yield* sleep(opts.duration ?? 300);
    console.log(`Concurrency example complete`);
  })();
}
