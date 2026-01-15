import { parseArgs } from "node:util";
import { main, suspend, type Operation } from "effection";
import type { ServiceGraph, ServiceDefinition } from "./services.ts";

/**
 * CLI operation that parses args and runs a service graph runner.
 *
 * This operation accepts the runner returned by `useServiceGraph` and starts
 * the requested subset of services. It supports `--services` (comma
 * separated), `--watch` and `--watch-debounce` options for convenience when
 * iterating on local development.
 *
 * @param serviceGraph - runner factory returned by `useServiceGraph`
 */
export function* simulationCLIOp<S extends Record<string, any>, T = any>(
  serviceGraph: (subset?: string[] | string) => Operation<ServiceGraph<S, T>>
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
      process.stdout.write(
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

/**
 * Run a service graph runner inside an effection main loop suitable for use
 * as a Node CLI. This invokes `simulationCLIOp` under `main` and returns the
 * resulting promise.
 *
 * @param serviceGraph - runner factory returned by `useServiceGraph`
 */
export async function simulationCLI<
  S extends Record<string, ServiceDefinition<string, T>>,
  T
>(serviceGraph: (subset?: string[] | string) => Operation<ServiceGraph<S, T>>) {
  return main(() => simulationCLIOp(serviceGraph));
}
