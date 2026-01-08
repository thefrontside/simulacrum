#!/usr/bin/env node
import { sleep, each, type Stream } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useService } from "../src/service.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
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
                return { ok: true, value: undefined };
              }
              yield* each.next();
            }
            // default success
            return { ok: true, value: undefined };
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
                return { ok: true, value: undefined };
              }
              yield* each.next();
            }
            // default success
            return { ok: true, value: undefined };
          },
        },
      }
    ),
  },
  dependent: {
    deps: ["fast", "slow"] as const,
    operation: (function* () {
      console.log("dependent: all deps started; running dependent logic");
      yield* sleep(50);
    })(),
  },
};

export const services = useServiceGraph(servicesMap);

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services());
}

export function example(
  opts: { duration?: number; sequential?: boolean } = {}
) {
  return (function* () {
    if (opts.sequential) {
      console.log("Running concurrency example in sequential mode");
    }
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 300);
    console.log(`Concurrency example complete`);
  })();
}
