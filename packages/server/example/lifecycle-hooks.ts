#!/usr/bin/env node
import { sleep, each, type Stream } from "effection";
import { useService } from "../src/service.ts";
import { useServiceGraph } from "../src/services.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
  provider: {
    operation: useService(
      "provider",
      "node --import tsx ./example/services/fast.ts",
      {
        wellnessCheck: {
          frequency: 10,
          *operation(stdio: Stream<string, void>) {
            for (let line of yield* each<string>(stdio)) {
              if (line.includes("started")) {
                return { ok: true, value: undefined };
              }
              yield* each.next();
            }
            return { ok: true, value: undefined };
          },
        },
      }
    ),
    afterStart() {
      return (function* () {
        console.log("provider: afterStart");
      })();
    },
    beforeStop() {
      return (function* () {
        console.log("provider: beforeStop");
      })();
    },
  },
  consumer: {
    deps: ["provider"] as const,
    operation: useService(
      "consumer",
      "node --import tsx ./example/services/a.ts",
      {
        wellnessCheck: {
          frequency: 10,
          *operation(stdio: Stream<string, void>) {
            for (let line of yield* each<string>(stdio)) {
              if (line.includes("started")) {
                return { ok: true, value: undefined };
              }
              yield* each.next();
            }
            return { ok: true, value: undefined };
          },
        },
      }
    ),
    afterStart() {
      return (function* () {
        console.log("consumer: afterStart");
      })();
    },
    beforeStop() {
      return (function* () {
        console.log("consumer: beforeStop");
      })();
    },
  },
};

export const services = useServiceGraph(servicesMap);

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services());
}

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    console.log(`Starting lifecycle hooks example`);
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 150);
    console.log(`Lifecycle example complete`);
  })();
}
