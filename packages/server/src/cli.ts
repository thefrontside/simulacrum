import { parseArgs } from "node:util";
import { main, suspend, type Operation } from "effection";
import { useAttributes } from "./logging.ts";
import type { ServiceGraph, ServiceDefinition } from "./services.ts";
import { Debugging, logger } from "./logging.ts";

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
  serviceGraph: (subset?: Array<keyof S>) => Operation<ServiceGraph<S, T>>,
) {
  try {
    const { values } = parseArgs({
      options: {
        services: { type: "string", short: "s" },
        debug: { type: "boolean", short: "d", default: false },
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
        `Usage: cli [-s|--services serviceName] [--watch] [--watch-debounce ms]`,
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
    yield* useAttributes({
      name: "cli",
      subset: subset ? subset.join(", ") : "",
      watch: String(!!values.watch),
      watchDebounce: String(values["watch-debounce"] ?? ""),
      debug: String(!!values.debug),
    });

    const runOptions: { watch?: boolean; watchDebounce?: number } = {
      watch: !!values.watch,
    };
    if (values["watch-debounce"]) runOptions.watchDebounce = Number(values["watch-debounce"]);

    yield* Debugging.set(values.debug);

    // Start the graph and fetch the provided info
    // subset is a string array from CLI; cast to service key array for strict runner
    yield* serviceGraph(subset as unknown as Array<keyof S>);

    yield* suspend();
  } catch (err) {
    yield* logger.stderr(`simulationCLI error:`, err instanceof Error ? err.stack : err);
  } finally {
    yield* logger.debug("simulationCLI finally");
  }
}

/**
 * Run a service graph runner inside an effection main loop suitable for use
 * as a Node CLI. This invokes `simulationCLIOp` under `main` and returns the
 * resulting promise.
 *
 * @param serviceGraph - runner factory returned by `useServiceGraph`
 */
export async function simulationCLI<S extends Record<string, ServiceDefinition<string, T>>, T>(
  serviceGraph: (subset?: Array<keyof S>) => Operation<ServiceGraph<S, T>>,
) {
  return main(() => simulationCLIOp(serviceGraph));
}
