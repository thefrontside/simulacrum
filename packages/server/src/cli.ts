import { parseArgs } from "node:util";
import { main, sleep, suspend, until, withResolvers } from "effection";
import { spawn as spawnProcess } from "node:child_process";
import { useAttributes } from "./logging.ts";
import type {
  ServiceDefinition,
  ServiceGraphRunOptions,
  ServiceGraphRunner,
  ServiceGraphStatus,
} from "./service-graph.ts";
import { Debugging, logger } from "./logging.ts";

export const DEFAULT_CONTROL_PORT = 43034;

function parseServiceList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);
}

function parseControlPort(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`invalid control port '${value}'`);
  }
  return port;
}

async function launchBackgroundProcess() {
  const childArgs = process.argv.slice(1).filter((arg) => arg !== "--background");
  childArgs.push("--managed-child");

  const child = spawnProcess(process.execPath, [...process.execArgv, ...childArgs], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });

  child.unref();
}

function* waitForControlService(controlPort: number) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    try {
      const response = yield* until(fetch(`http://127.0.0.1:${controlPort}/health`));
      if (response.ok) {
        return;
      }
    } catch (ignore) {
      // keep polling until the child is ready or we time out
    }

    yield* sleep(25);
  }

  throw new Error(`timed out waiting for background graph on port ${controlPort}`);
}

function* hasControlService(controlPort: number) {
  try {
    const response = yield* until(fetch(`http://127.0.0.1:${controlPort}/health`));
    return response.ok;
  } catch (ignore) {
    return false;
  }
}

function* getControlServiceStatus(controlPort: number) {
  try {
    const response = yield* until(fetch(`http://127.0.0.1:${controlPort}/status`));
    if (!response.ok) {
      return undefined;
    }

    return (yield* until(response.json())) as ServiceGraphStatus;
  } catch (ignore) {
    return undefined;
  }
}

function* throwIfGraphAlreadyRunning(controlPort: number) {
  if (!(yield* hasControlService(controlPort))) {
    return;
  }

  const runningGraph = yield* getControlServiceStatus(controlPort);
  throw new Error(
    `a background graph is already running on http://127.0.0.1:${controlPort} from ${runningGraph?.cwd ?? "unknown working directory"}; use --stop to stop it first`,
  );
}

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
export function* simulationCLIOp<S extends Record<string, ServiceDefinition<string, any>>>(
  serviceGraph: ServiceGraphRunner<S>,
) {
  try {
    const { values } = parseArgs({
      options: {
        services: { type: "string", short: "s" },
        "exclude-services": { type: "string" },
        debug: { type: "boolean", short: "d", default: false },
        help: { type: "boolean", short: "h" },
        watch: { type: "boolean" },
        "watch-debounce": { type: "string" },
        background: { type: "boolean" },
        stop: { type: "boolean" },
        restart: { type: "boolean" },
        status: { type: "boolean" },
        "restart-service": { type: "string" },
        "control-port": { type: "string" },
        "managed-child": { type: "boolean" },
      },
      allowPositionals: true,
      allowNegative: true,
      allowUnknown: true,
    });

    function* printUsage() {
      process.stdout.write(
        `Usage: cli [-s|--services serviceName] [--exclude-services serviceName] [--watch] [--watch-debounce ms] [--background --control-port port] [--stop --control-port port] [--restart --restart-service serviceName]`,
      );
    }

    if (values.help) {
      return yield* printUsage();
    }

    if (values.restart && values.stop) {
      throw new Error("--restart and --stop cannot be used together");
    }

    if (values.restart && values.background) {
      throw new Error("--restart and --background cannot be used together");
    }

    const subset = parseServiceList(values.services as string | undefined);
    const excluded = parseServiceList(values["exclude-services"] as string | undefined);
    const requestedControlPort = parseControlPort(values["control-port"] as string | undefined);
    const controlPort =
      values.background || values.stop || values["managed-child"]
        ? (requestedControlPort ?? DEFAULT_CONTROL_PORT)
        : requestedControlPort;
    yield* useAttributes({
      name: "cli",
      subset: subset ? subset.join(", ") : "",
      excludedServices: excluded ? excluded.join(", ") : "",
      watch: String(!!values.watch),
      watchDebounce: String(values["watch-debounce"] ?? ""),
      debug: String(!!values.debug),
      background: String(!!values.background),
      stop: String(!!values.stop),
      restart: String(!!values.restart),
      restartService: String(values["restart-service"] ?? ""),
      controlPort: String(controlPort ?? ""),
    });

    const runOptions: ServiceGraphRunOptions = {
      watch: !!values.watch,
      controlPort,
      exclude: excluded,
    };
    if (values["watch-debounce"]) {
      runOptions.watchDebounce = Number(values["watch-debounce"]);
    }

    yield* Debugging.set(values.debug);

    if (values.stop) {
      const response = yield* until(
        fetch(`http://127.0.0.1:${controlPort}/stop`, { method: "POST" }),
      );
      if (!response.ok) {
        throw new Error(
          `failed to stop background graph on port ${controlPort}: ${response.status}`,
        );
      }
      return;
    }

    if (values.status) {
      const backgroundControlPort = controlPort ?? DEFAULT_CONTROL_PORT;
      const url = new URL(`http://127.0.0.1:${backgroundControlPort}/status`);
      const response = yield* until(fetch(url.toString(), { method: "GET" }));
      if (!response.ok) {
        throw new Error(
          `failed to fetch status of background graph on port ${backgroundControlPort}: ${response.status}`,
        );
      }
      const json = yield* until(response.json());
      if (typeof json === "object" && json && "cwd" in json) {
        console.log(
          `cwd: ${json.cwd}\nservices:\n${
            "services" in json
              ? Object.entries(json.services as Record<string, { port?: number; pid?: number }>)
                  .map(
                    ([name, info]) =>
                      `  ${name}: ${info.port ? `port ${info.port}` : ""}${info.pid ? `; pid ${info.pid}` : ""}`,
                  )
                  .join("\n")
              : "no service info available"
          }`,
        );
      }
      return;
    }

    if (values.restart || values["restart-service"]) {
      const backgroundControlPort = controlPort ?? DEFAULT_CONTROL_PORT;
      const service = values["restart-service"] as string | undefined;
      const url = new URL(`http://127.0.0.1:${backgroundControlPort}/restart`);
      if (service) {
        url.searchParams.set("service", service);
      }
      const response = yield* until(fetch(url.toString(), { method: "POST" }));
      if (!response.ok) {
        const text = yield* until(response.text());
        throw new Error(
          `failed to restart background graph on port ${backgroundControlPort}:\n  ${text}`,
        );
      }
      const json = yield* until(response.json());
      if (typeof json === "object" && json && "ok" in json && json.ok) {
        console.log(
          `restart request accepted for service '${service ?? "all"}' on background graph at port ${backgroundControlPort}`,
        );
      }
      return;
    }

    if (values.background && !values["managed-child"]) {
      const backgroundControlPort = controlPort ?? DEFAULT_CONTROL_PORT;

      yield* throwIfGraphAlreadyRunning(backgroundControlPort);

      yield* until(launchBackgroundProcess());
      yield* waitForControlService(backgroundControlPort);
      yield* logger.stdout(`background graph ready on http://127.0.0.1:${backgroundControlPort}`);
      return;
    }

    if (values["managed-child"]) {
      const stopRequested = withResolvers<void>("wait for a stop request from the runtime service");

      yield* serviceGraph(subset as unknown as Array<keyof S>, {
        ...runOptions,
        requestStop: () => stopRequested.resolve(),
      });

      yield* stopRequested.operation;
      return;
    }

    yield* throwIfGraphAlreadyRunning(requestedControlPort ?? DEFAULT_CONTROL_PORT);

    // Start the graph and fetch the provided info
    // subset is a string array from CLI; cast to service key array for strict runner
    yield* serviceGraph(subset as unknown as Array<keyof S>, runOptions);

    yield* suspend();
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
export async function simulationCLI<S extends Record<string, ServiceDefinition<string, any>>>(
  serviceGraph: ServiceGraphRunner<S>,
) {
  try {
    return await main(() => simulationCLIOp(serviceGraph));
  } catch (err) {
    process.exitCode = 1;
    console.error("simulationCLI error:", err instanceof Error ? err.stack : err);
  }
}
