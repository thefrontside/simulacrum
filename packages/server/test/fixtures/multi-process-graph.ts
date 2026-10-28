#!/usr/bin/env node
import { resource, suspend } from "effection";
import { daemon } from "@effectionx/process";
import { fileURLToPath } from "node:url";
import { simulationCLI } from "../../src/cli.ts";
import { useServiceGraph } from "../../src/service-graph.ts";

export const services = useServiceGraph({
  worker: {
    operation: resource(function* (provide) {
      const first = yield* daemon(process.execPath, {
        arguments: ["-e", "setInterval(() => {}, 10000)"],
      });
      const second = yield* daemon(process.execPath, {
        arguments: ["-e", "setInterval(() => {}, 10000)"],
      });

      process.stdout.write(`tracked-child-pids:${first.pid},${second.pid}\n`);
      yield* provide({ pid: second.pid });
      yield* suspend();
    }),
  },
  reported: {
    operation: resource(function* (provide) {
      const pid = Number(process.env.SIMULACRUM_TEST_REPORTED_PID);
      yield* provide({ pid });
      yield* suspend();
    }),
  },
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
