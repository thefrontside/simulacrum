import { parseArgs } from "node:util";
import { suspend, main } from "effection";
import type { ServiceRunner } from "./services.ts";

// Internal generator operation used by both the CLI (via main) and programmatically
export function* simulationCLIOp<S extends Record<string, any>>(
  runner: ServiceRunner<S>
) {
  const { values } = parseArgs({
    options: {
      services: { type: "string", short: "s" },
      debug: { type: "boolean", short: "d" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    allowNegative: true,
    allowUnknown: true,
  });

  function* printUsage() {
    const available = Object.keys(
      runner.services as unknown as Record<string, unknown>
    ).join(", ");
    console.log(`Usage: cli [-s|--services serviceName]
Available services: ${available}
`);
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

  yield* runner(subset);
  yield* suspend();
}

// Public helper: call this from examples or CLI entrypoints — it will invoke effection's main()
export function simulationCLI<S extends Record<string, any>>(
  runner: ServiceRunner<S>
) {
  return main(() => simulationCLIOp(runner));
}
