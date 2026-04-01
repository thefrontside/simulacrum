import { resource, until, spawn, each, withResolvers } from "effection";
import { useAttributes } from "./logging.ts";
import type { Operation } from "effection";
import { daemon } from "@effectionx/process";
import { logger } from "./logging.ts";
import type {
  FoundationSimulator,
  FoundationSimulatorListening,
} from "@simulacrum/foundation-simulator";
import { SimulacrumEndpoint } from "./services.ts";

/**
 * Helper to start a foundation simulation server factory
 *
 * This is implemented as an Effection `resource` so cleanup is handled by the
 * `provide` finalizer when the operation's scope is closed.
 */ /**
 * Start a simulator provided by a factory and return its listening info.
 *
 * The factory may accept initialization data (fetched from the simulacrum
 * gateway when available) and should return a `FoundationSimulator` instance
 * (or a Promise resolving to one). This operation yields the simulator's
 * listening information (`{ port }`) once it starts.
 *
 * @param name - human-friendly name used for logging
 * @param createFactory - factory function that returns a `FoundationSimulator`
 * @returns an `Operation` that provides `FoundationSimulatorListening` when the
 * simulator is listening
 */ export function useSimulation<L extends object = Record<string, unknown>>(
  name: string,
  createFactory: (initData?: unknown) => FoundationSimulator<L>,
): Operation<FoundationSimulatorListening<L>> {
  return resource(function* (provide) {
    yield* useAttributes({ name: `useSimulation ${name}` });
    // attempt to read the simulacrum port from context; if not present, continue without it
    const simulacrumPort = yield* SimulacrumEndpoint.get();

    // if present fetch the data chunk and pass it to the factory
    let initData: unknown | undefined = undefined;
    if (typeof simulacrumPort === "number" && !Number.isNaN(simulacrumPort)) {
      try {
        const res = yield* until(fetch(`http://127.0.0.1:${simulacrumPort}/data`));
        initData = yield* until(res.json());
      } catch (err) {
        // ignore fetch failures
        yield* logger.stderr("failed to fetch simulacrum data:", err);
      }
    }

    const createSim = createFactory(initData);
    const listening: FoundationSimulatorListening<L> = yield* until(createSim.listen());

    yield* logger.stdout(`${name} simulation: port ${listening.port}`);
    yield* useAttributes({
      name: `useSimulation ${name}`,
      port: String(listening.port),
    });

    try {
      yield* provide(listening);
    } finally {
      yield* until(listening.ensureClose());
      yield* logger.stdout(`${name} simulation: closed port ${listening.port}`);
    }
  });
}

// Spawn a child Node process to run a simulation factory in a fresh module
// environment. This avoids sharing module cache and allows restarts to pick up
// new code. The runtime uses `bin/run-simulation-child.ts`.
/**
 * Spawn a child Node process to run a simulation factory.
 *
 * This runs `bin/run-simulation-child.ts <modulePath>` in a separate Node
 * process and reads the first JSON line printed to stdout to discover the
 * child's listening port. Optionally the simulacrum gateway port will be
 * passed to the child so it can fetch `globalData`.
 *
 * @param name - human-friendly name for logging
 * @param modulePath - path to the module exporting a simulation factory or instance
 * @returns an `Operation` that provides `FoundationSimulatorListening` from the child
 */
export function useChildSimulation(name: string, modulePath: string) {
  return resource<{ port: number; pid: number }>(function* (provide) {
    yield* useAttributes({
      name: `useChildSimulation ${name}`,
      module: modulePath,
    });
    // attempt to read the simulacrum port from context; if not present, continue without it
    const contextPort = yield* SimulacrumEndpoint.get();

    const parts = ["node", "--import", "tsx", "./bin/run-simulation-child.ts", modulePath];
    if (typeof contextPort === "number") {
      parts.push("--simulacrum-port", String(contextPort));
    }
    const cmd = parts.map((s) => (s.includes(" ") ? `'${s}'` : s)).join(" ");

    const process = yield* daemon(cmd);
    const pid = process.pid;
    yield* useAttributes({
      name: `useChildSimulation ${name}`,
      cmd,
      pid: String(pid),
    });

    // read the first stdout JSON line to get the listening info
    let port = undefined as number | undefined;
    let ready = withResolvers<void>("wait until the port is returned to signal ready");

    // forward raw stdout for logging in chunk form (no reassembly)
    yield* spawn(function* () {
      yield* useAttributes({
        name: "stdoutForward",
      });
      for (let line of yield* each(process.stdout)) {
        const buf = Buffer.from(line);
        const str = buf.toString();

        if (!port) {
          try {
            const parsed = JSON.parse(str);
            if (parsed && parsed.ready && typeof parsed.port === "number") {
              port = parsed.port;
              ready.resolve();
            } else {
              yield* logger.stdout(str);
            }
          } catch (_) {
            // just log lines that are not JSON
            yield* logger.stdout(str);
          }
        } else {
          yield* logger.stdout(str);
        }

        yield* each.next();
      }
    });

    yield* spawn(function* () {
      yield* useAttributes({
        name: "stderrForward",
      });
      for (let line of yield* each(process.stderr)) {
        const str = Buffer.from(line).toString();
        yield* logger.stderr(str);
        yield* each.next();
      }
    });

    // spawn a watcher to detect if the child exits before printing the listening info
    let status: unknown = undefined;
    yield* spawn(function* () {
      yield* useAttributes({
        name: "childEarlyExitWatcher",
      });
      status = yield* process.join();
      if (!port) {
        ready.reject(
          new Error(
            `child process exited before emitting listening info: ${JSON.stringify(status)}`,
          ),
        );
      }
    });

    // wait to get the listening info from stdout (or reject if the process exited)
    yield* ready.operation;

    if (!port) {
      throw new Error(
        `failed to get listening port from child process: ${JSON.stringify({
          status,
          pid,
        })}`,
      );
    }

    yield* logger.stdout(`${name} simulation: port ${port} pid ${pid}`);

    try {
      yield* provide({ port, pid });
    } finally {
      yield* logger.debug(`${name} simulation: closed on port ${port}`);
    }
  });
}
