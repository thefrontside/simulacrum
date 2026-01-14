#!/usr/bin/env node
import { main, suspend, until, type Operation } from "effection";
import { pathToFileURL } from "node:url";
import type {
  FoundationSimulator,
  FoundationSimulatorListening,
} from "@simulacrum/foundation-simulator";

function guardedFactory(
  factory: Function
): (initData?: unknown) => Promise<FoundationSimulator<any>> {
  return async function startSimulation(initData?: unknown) {
    const sim = await factory(initData);
    if ("listen" in sim && typeof sim.listen === "function") {
      return sim as FoundationSimulator<any>;
    }
    throw new Error("factory did not return a simulator instance");
  };
}

function* normalizeSimulatorFactory(url: string) {
  try {
    const mod: unknown = yield* until(import(url));

    // dynamically import module has to be an object if correctly resolved
    if (mod && typeof mod === "object") {
      const m = mod;

      // export default as factory
      if ("default" in m && typeof m.default === "function") {
        const factory = m.default;
        return guardedFactory(factory);
      }

      // export named 'simulation' as factory
      if ("simulation" in m && typeof m.simulation === "function") {
        const factory = m.simulation;
        return guardedFactory(factory);
      }
    }
  } catch (err) {
    // no-op - will throw in fall through below
  }
  throw new Error("no factory or simulator instance found in module");
}

main(function* () {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    throw new Error("usage: run-simulation-child.js <modulePath>");
  }

  const modulePath = args[0];

  // Resolve and import module inside the operation
  const url =
    modulePath.startsWith("./") || modulePath.startsWith("/")
      ? pathToFileURL(modulePath).href
      : modulePath;
  const factory = yield* normalizeSimulatorFactory(url);

  let simulacrumPort: number | undefined = undefined;
  // parse optional flags after modulePath
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--simulacrum-port") {
      simulacrumPort = Number(args[i + 1]);
      i++;
    }
  }

  // if present fetch the data chunk and pass it to the factory
  let initData: JSON | undefined = undefined;
  if (typeof simulacrumPort === "number" && !Number.isNaN(simulacrumPort)) {
    try {
      const res = yield* until(
        fetch(`http://127.0.0.1:${simulacrumPort}/data`)
      );
      initData = yield* until(res.json());
    } catch (err) {
      // ignore fetch failures
      console.error("failed to fetch simulacrum data:", err);
    }
  }

  // invoke factory; it may return a simulator instance or a Promise thereof
  const sim = yield* until(factory(initData));

  let listening: FoundationSimulatorListening<any> | undefined = undefined;
  try {
    listening = yield* until(sim.listen());
    const out = JSON.stringify({
      ready: true,
      port: listening.port,
      pid: process.pid,
    });
    console.log(out);
    yield* suspend();
  } finally {
    try {
      if (listening && typeof listening.ensureClose === "function") {
        yield* until(listening.ensureClose());
      }
    } catch (err) {
      // ignore
    }
  }
});
