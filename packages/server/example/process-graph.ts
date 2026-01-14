#!/usr/bin/env node
import { sleep, each, type Stream } from "effection";
import { useService } from "../src/service.ts";
import { useServiceGraph } from "../src/services.ts";
import { simulationCLI } from "../src/cli.ts";

const servicesMap = {
  A: {
    operation: useService(
      "A",
      "node --import tsx ./example/services/basic-start-1.ts",
      {
        wellnessCheck: {
          frequency: 10,
          *operation(stdio: Stream<string, void>) {
            for (let line of yield* each<string>(stdio)) {
              if (line.includes("started")) {
                console.log("A ready (wellnessCheck)");
                return { ok: true, value: undefined };
              }
              yield* each.next();
            }
            // default: return success so the result type is well-formed
            return { ok: true, value: undefined };
          },
        },
      }
    ),
  },
  B: {
    dependsOn: { startup: ["A"] as const },
    operation: useService(
      "B",
      "node --import tsx ./example/services/basic-start-2.ts",
      {
        wellnessCheck: {
          frequency: 10,
          *operation(stdio: Stream<string, void>) {
            for (let line of yield* each<string>(stdio)) {
              if (line.includes("started")) {
                console.log("B ready (wellnessCheck)");
                return { ok: true, value: undefined };
              }
              yield* each.next();
            }
            // default: return success so the result type is well-formed
            return { ok: true, value: undefined };
          },
        },
      }
    ),
  },
};

export const services = useServiceGraph(servicesMap);

export function example(opts: { duration?: number } = {}) {
  return (function* () {
    const run = services;
    yield* run();
    yield* sleep(opts.duration ?? 300);
    console.log(`Basic example complete`);
  })();
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // run via CLI when executed directly
  simulationCLI(services);
}
