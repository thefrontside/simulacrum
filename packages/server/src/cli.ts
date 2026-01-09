import { parseArgs } from "node:util";
import { main, suspend, type Operation } from "effection";
import type { ServiceGraph } from "./services.ts";

export function* simulationCLIOp<S extends Record<string, any>>(
  serviceGraph: (subset?: string[] | string) => Operation<ServiceGraph<S>>
) {
  try {
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
  } catch (err) {
    console.error(
      "simulationCLI error:",
      err instanceof Error ? err.stack : err
    );
  }
}

export async function simulationCLI<
  S extends Record<string, ServiceDefinition<string, T>>,
  T
>(serviceGraph: (subset?: string[] | string) => Operation<ServiceGraph<S, T>>) {
  return main(() => simulationCLIOp(serviceGraph));
}
