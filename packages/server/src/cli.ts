import { parseArgs } from "node:util";
import { suspend, main, type Operation } from "effection";
import type { ServiceGraphValue } from "./services.ts";

// Internal generator operation used by both the CLI (via main) and programmatically
export function* simulationCLIOp<S extends Record<string, any>>(
  runnerOp: Operation<ServiceGraphValue<S>>
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
    // When we only have the operation form we cannot enumerate services
    // without starting the graph — so show a succinct help message.
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
  if (subset) {
    // subset-run no longer supported for operation-style graphs; warn
    // (consumer should construct a graph for the subset explicitly)
    // eslint-disable-next-line no-console
    console.warn(
      "--services subset not supported with operation-style runner; starting full graph"
    );
  }

  const runOptions: { watch?: boolean; watchDebounce?: number } = {
    watch: !!values.watch,
  };
  if (values["watch-debounce"])
    runOptions.watchDebounce = Number(values["watch-debounce"]);

  // Start the graph and fetch the provided info
  const servicesVal = yield* runnerOp;
  if (runOptions.watch) {
    // eslint-disable-next-line no-console
    console.log("starting in watch mode; watched paths:");
    for (const name of Object.keys(servicesVal.services)) {
      const def = servicesVal.services[name];
      const watch = def.watch
        ? typeof def.watch === "function"
          ? (def.watch as () => string[])()
          : def.watch
        : undefined;
      if (watch) console.log(` - ${name}: ${watch.join(", ")}`);
    }
  }

  yield* suspend();
}

// Public helper: call this from examples or CLI entrypoints — it will invoke effection's main()
export function simulationCLI<S extends Record<string, any>>(
  runnerOp: Operation<ServiceGraphValue<S>>
) {
  return main(() => simulationCLIOp<S>(runnerOp));
}
