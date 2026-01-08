import { parseArgs } from "node:util";
import { suspend, main, type Operation } from "effection";
import type { ServiceGraphValue } from "./services.ts";

export function* simulationCLIOp<S extends Record<string, any>>(
  serviceGraph: (subset?: string[] | string) => Operation<ServiceGraphValue<S>>
) {
  const { values } = parseArgs({
    options: {
      services: { type: "string", short: "s" },
      debug: { type: "boolean", short: "d" },
      help: { type: "boolean", short: "h" },
      watch: { type: "boolean" },
      "watch-debounce": { type: "string" },
    },
    allowPositionals: true,
    allowNegative: true,
    allowUnknown: true,
  });

  function* printUsage() {
    console.log(
      `Usage: cli [-s|--services serviceName] [--watch] [--watch-debounce ms]`
    );
  }

  if (values.help) {
    return yield* printUsage();
  }

  const subset = values.services
    ? (values.services as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const runOptions: { watch?: boolean; watchDebounce?: number } = {
    watch: !!values.watch,
  };
  if (values["watch-debounce"])
    runOptions.watchDebounce = Number(values["watch-debounce"]);

  // Start the graph and fetch the provided info
  yield* serviceGraph(subset);

  yield* suspend();
}

export function simulationCLI<S extends Record<string, any>>(
  serviceGraph: (subset?: string[] | string) => Operation<ServiceGraphValue<S>>
) {
  return main(() => simulationCLIOp<S>(serviceGraph));
}
