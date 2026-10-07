#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { simulationCLI } from "../../src/cli.ts";
import { useServiceGraph } from "../../src/service-graph.ts";

export const services = useServiceGraph(
  {},
  {
    globalData: { background: true },
    ...(process.env.SIMULACRUM_TEST_GRAPH_CONTROL_PORT
      ? { controlPort: Number(process.env.SIMULACRUM_TEST_GRAPH_CONTROL_PORT) }
      : {}),
  },
);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services, {
    launchGraph(request, launchDefault) {
      process.stdout.write(`custom launcher: ${request.mode}\n`);
      return launchDefault(request);
    },
  });
}
