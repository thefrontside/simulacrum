import { parseArgs } from "node:util";
import {
  main,
  call,
  ensure,
  race,
  sleep,
  until,
  useAbortSignal,
  withResolvers,
  type Operation,
  type Subscription,
} from "effection";
import { spawn as spawnProcess, type ChildProcess } from "node:child_process";
import { on, once } from "@effectionx/node/events";
import { useAttributes } from "./logging.ts";
import type {
  ServiceDefinition,
  ServiceGraphRunOptions,
  ServiceGraphRunner,
  ServiceGraphStatus,
} from "./service-graph.ts";
import { Debugging, logger } from "./logging.ts";

export const DEFAULT_CONTROL_PORT = 43034;

export type GraphLaunchRequest = {
  command: string;
  args: string[];
  mode: "foreground" | "background";
  cwd: string;
  env: NodeJS.ProcessEnv;
  detached: boolean;
  stdio: "inherit" | "ignore";
};

export type GraphLaunchHook = (
  request: GraphLaunchRequest,
  launchDefault: (request: GraphLaunchRequest) => ChildProcess,
) => ChildProcess;

export type SimulationCLIOptions = {
  launchGraph?: GraphLaunchHook;
};

function* nextEvent<T extends unknown[]>(subscription: Subscription<T, never>): Operation<T> {
  const next = yield* subscription.next();
  if (next.done) throw new Error("event stream closed unexpectedly");
  return next.value;
}

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

function launchGraphProcess(
  mode: GraphLaunchRequest["mode"],
  launchGraph?: GraphLaunchHook,
): ChildProcess {
  const childArgs = process.argv.slice(1).filter((arg) => arg !== "--background");
  childArgs.splice(1, 0, "start");
  if (
    mode === "background" &&
    !childArgs.some((arg) => arg === "--control-port" || arg.startsWith("--control-port="))
  ) {
    childArgs.push("--control-port", String(DEFAULT_CONTROL_PORT));
  }

  const request: GraphLaunchRequest = {
    command: process.execPath,
    args: [...process.execArgv, ...childArgs],
    mode,
    cwd: process.cwd(),
    env: process.env,
    detached: mode === "background",
    stdio: mode === "background" ? "ignore" : "inherit",
  };

  const launchDefault = (next: GraphLaunchRequest) =>
    spawnProcess(next.command, next.args, {
      cwd: next.cwd,
      env: next.env,
      detached: next.detached,
      stdio: next.stdio,
    });
  const child = launchGraph ? launchGraph(request, launchDefault) : launchDefault(request);
  if (mode === "background") child.unref();
  return child;
}

function* waitForControlService(controlPort: number) {
  const signal = yield* useAbortSignal();
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    let response: Response;
    try {
      response = yield* until(fetch(`http://127.0.0.1:${controlPort}/ready`, { signal }));
    } catch {
      // it will error if we try to fetch before the service is actually listening
      // maybe order things better in the future to avoid this requirement?
      yield* sleep(25);
      continue;
    }

    if (!response.ok) {
      const reason = yield* until(response.text());
      throw new Error(`background graph on port ${controlPort} did not become ready: ${reason}`);
    }
    return;
  }

  throw new Error(`timed out waiting for control plane on port ${controlPort}`);
}

function* waitForBackgroundGraph(controlPort: number, child: ChildProcess) {
  const exits = yield* on<[number | null, NodeJS.Signals | null]>(child, "exit");
  const errors = yield* on<[Error]>(child, "error");
  yield* race([
    waitForControlService(controlPort),
    call(function* () {
      const [code, signal] = yield* nextEvent(exits);
      throw new Error(
        `managed graph exited before becoming ready (code ${code}, signal ${signal})`,
      );
    }),
    call(function* () {
      const [error] = yield* nextEvent(errors);
      throw error;
    }),
  ]);
}

function* waitForForegroundGraph(child: ChildProcess) {
  let exits: Subscription<[number | null, NodeJS.Signals | null], never> | undefined;
  yield* ensure(function* () {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return;

    const exit = exits
      ? nextEvent(exits)
      : once<[number | null, NodeJS.Signals | null]>(child, "exit");
    child.kill("SIGTERM");
    const stopped = yield* race([
      call(function* () {
        yield* exit;
        return true;
      }),
      call(function* () {
        yield* sleep(1000);
        return false;
      }),
    ]);

    if (!stopped && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      if (exits) {
        yield* nextEvent(exits);
      } else {
        yield* once<[number | null, NodeJS.Signals | null]>(child, "exit");
      }
    }
  });

  exits = yield* on<[number | null, NodeJS.Signals | null]>(child, "exit");
  const errors = yield* on<[Error]>(child, "error");

  const outcome = yield* race([
    call(function* () {
      const [code, signal] = yield* nextEvent(exits);
      return { type: "exit" as const, code, signal };
    }),
    call(function* () {
      const [error] = yield* nextEvent(errors);
      return { type: "error" as const, error };
    }),
  ]);

  if (outcome.type === "error") throw outcome.error;
  if (outcome.code !== 0) {
    throw new Error(`foreground graph exited (code ${outcome.code}, signal ${outcome.signal})`);
  }
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
  options: SimulationCLIOptions = {},
) {
  try {
    const { values, positionals } = parseArgs({
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
      values.background || values.stop
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
              ? Object.entries(
                  json.services as Record<string, { state?: string; port?: number; pid?: number }>,
                )
                  .map(
                    ([name, info]) =>
                      `  ${name}: ${info.state ?? "unknown"}${info.port ? `; port ${info.port}` : ""}${info.pid ? `; pid ${info.pid}` : ""}`,
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

    if (positionals[0] !== "start") {
      const mode = values.background ? "background" : "foreground";
      const graphControlPort =
        mode === "background" ? (controlPort ?? DEFAULT_CONTROL_PORT) : requestedControlPort;
      yield* throwIfGraphAlreadyRunning(graphControlPort ?? DEFAULT_CONTROL_PORT);

      const child = launchGraphProcess(mode, options.launchGraph);
      if (mode === "background") {
        try {
          yield* waitForBackgroundGraph(graphControlPort ?? DEFAULT_CONTROL_PORT, child);
        } catch (error) {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
          throw error;
        }
        yield* logger.stdout(`background graph ready on http://127.0.0.1:${graphControlPort}`);
      } else {
        yield* waitForForegroundGraph(child);
      }
      return;
    }

    if (values.background) {
      throw new Error("use --background without the 'start' subcommand");
    }

    yield* throwIfGraphAlreadyRunning(requestedControlPort ?? DEFAULT_CONTROL_PORT);

    // Start the graph and fetch the provided info
    // subset is a string array from CLI; cast to service key array for strict runner
    const stopRequested = withResolvers<void>("wait for a stop request from the runtime service");
    yield* serviceGraph(subset as unknown as Array<keyof S>, {
      ...runOptions,
      requestStop: () => stopRequested.resolve(),
    });

    yield* stopRequested.operation;
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
  options: SimulationCLIOptions = {},
) {
  try {
    return await main(() => simulationCLIOp(serviceGraph, options));
  } catch (err) {
    process.exitCode = 1;
    console.error("simulationCLI error:", err instanceof Error ? err.stack : err);
  }
}
