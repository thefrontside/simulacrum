import { parseArgs } from "node:util";
import { suspend, main } from "effection";
import { useServiceGraph } from "./index.ts";

// Internal generator operation used by both the CLI (via main) and programmatically
export function* simulationCLIOp(
  services: Parameters<typeof useServiceGraph>[0]
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
    console.log(`Usage: cli [-s|--services serviceName]
Available services: ${Object.keys(services).join(", ")}
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

  yield* useServiceGraph(services, subset);
  yield* suspend();
}

// Public helper: call this from examples or CLI entrypoints — it will invoke effection's main()
export function simulationCLI(services: Parameters<typeof useServiceGraph>[0]) {
  return main(() => simulationCLIOp(services));
}
