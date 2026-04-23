import { resource, until, spawn, each, withResolvers } from "effection";
import { useAttributes } from "./logging.ts";
import type { Operation } from "effection";
import { daemon, Stdio } from "@effectionx/process";
import { logger } from "./logging.ts";
import type {
  FoundationSimulator,
  FoundationSimulatorListening,
} from "@simulacrum/foundation-simulator";
import { SimulacrumEndpoint } from "./services.ts";
import { fileURLToPath } from "node:url";
import { versions } from "node:process";
import { withOperationMetadata } from "./operation-metadata.ts";

type UseSimulationOptions = {
  subprocess?: boolean;
};

function useSimulationInProcess<L extends object = Record<string, unknown>>(
  name: string,
  createFactory: (initData?: unknown) => FoundationSimulator<L>,
): Operation<FoundationSimulatorListening<L>> {
  return withOperationMetadata(
    resource(function* (provide) {
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
    }),
    { watchSafe: false, operationName: "useSimulation" },
  );
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
export function useSimulationChildProcess(name: string, modulePath: string) {
  return withOperationMetadata(
    resource<{ port: number; pid: number }>(function* (provide) {
      yield* useAttributes({
        name: `useSimulation ${name}`,
        module: modulePath,
      });
      // attempt to read the simulacrum port from context; if not present, continue without it
      const contextPort = yield* SimulacrumEndpoint.get();

      const runnerPath = fileURLToPath(
        import.meta.resolve("@simulacrum/server/bin/run-simulation-child.ts"),
      );
      // TODO config to overwrite the hard coded option here
      const parts = (
        Number(versions.node.split(".")[0]) >= 24
          ? ["node"]
          : [
              "node",
              // safest considering current LTS of >v20
              "--experimental-strip-types",
            ]
      ).concat([runnerPath, modulePath]);
      if (typeof contextPort === "number") {
        parts.push("--simulacrum-port", String(contextPort));
      }
      const cmd = parts.map((s) => (s.includes(" ") ? `'${s}'` : s)).join(" ");

      // read the first stdout JSON line to get the listening info
      let port = undefined as number | undefined;
      yield* Stdio.around({
        *stdout(line, _next) {
          const [bytes] = line;
          const str = bytes.toString();
          if (!port) {
            try {
              const parsed = JSON.parse(str);
              if (parsed && parsed.ready && typeof parsed.port === "number") {
                port = parsed.port;
                ready.resolve();
              } else {
                yield* logger.stdout(str);
              }
            } catch (ignore) {
              // just log lines that are not JSON
              yield* logger.stdout(str);
            }
          } else {
            yield* logger.stdout(str);
          }
        },
        *stderr(line, _next) {
          const [bytes] = line;
          const str = bytes.toString();
          yield* logger.stderr(str);
        },
      });

      const process = yield* daemon(cmd);
      const pid = process.pid;
      yield* useAttributes({
        name: `useSimulation ${name}`,
        cmd,
        pid: String(pid),
      });

      let ready = withResolvers<void>("wait until the port is returned to signal ready");

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

      yield* logger.debug(`${name} simulation: port ${port} pid ${pid}`);

      try {
        yield* provide({ port, pid });
      } finally {
        yield* logger.debug(`${name} simulation: closed on port ${port}`);
      }
    }),
    { watchSafe: true, operationName: "useSimulation" },
  );
}

/**
 * Run a simulator either in-process or in a child Node subprocess.
 *
 * When the second argument is a factory, `useSimulation` runs the simulator
 * in-process and resolves to the simulator's listening information.
 *
 * When the second argument is a module path string, `useSimulation` starts the
 * simulator in a fresh child process and resolves to the child's listening
 * information plus PID.
 *
 * If `globalData` is configured on the runner, this operation fetches the
 * data from the Simulacrum gateway and passes it as `initData` to the factory
 * or child module.
 *
 * @param name - human-friendly name used for logging
 * @param createFactory - factory function that returns a `FoundationSimulator`
 * @param modulePath - path to a module exporting a simulator factory
 * @param options - optional subprocess hint for overload resolution
 */
export function useSimulation<L extends object = Record<string, unknown>>(
  name: string,
  createFactory: (initData?: unknown) => FoundationSimulator<L>,
  options?: { subprocess?: false },
): Operation<FoundationSimulatorListening<L>>;
export function useSimulation(
  name: string,
  modulePath: string,
  options?: { subprocess?: true },
): Operation<{ port: number; pid: number }>;
export function useSimulation<L extends object = Record<string, unknown>>(
  name: string,
  factoryOrModulePath: ((initData?: unknown) => FoundationSimulator<L>) | string,
  options: UseSimulationOptions = {},
) {
  if (typeof factoryOrModulePath === "string") {
    if (options.subprocess === false) {
      throw new Error(
        "cannot use subprocess:false when the second argument is a module path string",
      );
    }

    return useSimulationChildProcess(name, factoryOrModulePath);
  }

  if (options.subprocess === true) {
    throw new Error(
      "subprocess:true is only supported when using a module path string as the second argument",
    );
  }

  return useSimulationInProcess(name, factoryOrModulePath);
}
