#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { simulationCLI } from "../../src/cli.ts";
import { useServiceGraph } from "../../src/services.ts";

export const services = useServiceGraph(
  {},
  {
    globalData: { background: true },
  },
);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
