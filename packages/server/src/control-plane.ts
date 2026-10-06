import {
  action,
  call,
  ensure,
  race,
  resource,
  sleep,
  spawn,
  type Operation,
  type Subscription,
  type WithResolvers,
  useScope,
  withResolvers,
} from "effection";
import type { ExecOptions, Process } from "@effectionx/process";
import type { ExitStatus } from "@effectionx/process";
import { on } from "@effectionx/node/events";
import { useAttributes } from "./logging.ts";
import { createServer } from "node:http";
import { logger } from "./logging.ts";
import type { Server, ServerResponse } from "node:http";
import { type ProcessReaperClient, useProcessReaper } from "./reaper.ts";
import {
  ServiceStatusRecord,
  type ServiceInfo,
  type ServiceInfoUpdate,
  type ServiceState,
} from "./service-status.ts";
import { GraphLauncher } from "./service-graph-context.ts";

export type { ServiceInfo, ServiceState } from "./service-status.ts";
export type ControlPlaneServiceInfo = ServiceInfo;

export type ControlPlaneOptions = {
  data?: Record<string, unknown>;
  port?: number | undefined;
  services?: readonly string[];
  requestStop?: (() => void) | undefined;
  requestRestart?: ((service?: string) => void) | undefined;
};

export type ControlPlane = {
  port: number;
  getServiceStatus: (name: string) => ServiceStatusRecord | undefined;
  getServiceInfo: (name: string) => ServiceInfo | undefined;
  setServiceInfo: (name: string, info: ServiceInfoUpdate) => void;
  clearServiceInfo: (name: string, state?: ServiceState) => void;
  trackProcess: <T extends Process>(
    name: string,
    command: string,
    options: ExecOptions,
    process: Operation<T>,
  ) => Operation<T>;
};

function* nextEvent<T extends unknown[]>(subscription: Subscription<T, never>): Operation<T> {
  const next = yield* subscription.next();
  if (next.done) throw new Error("event stream closed unexpectedly");
  return next.value;
}

function* listen(server: Server, port: number | undefined): Operation<void> {
  const listening = yield* on<[]>(server, "listening");
  const errors = yield* on<[Error]>(server, "error");
  server.listen(port ?? 0, "127.0.0.1");

  yield* race([
    nextEvent(listening),
    call(function* () {
      const [error] = yield* nextEvent(errors);
      throw error;
    }),
  ]);
}

function* close(server: Server): Operation<void> {
  yield* action<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    return () => {};
  }, "close control plane");
}

type ControlPlaneServerOptions = {
  data: Record<string, unknown>;
  port: number | undefined;
  services: Map<string, ServiceStatusRecord>;
  requestStop?: (() => void) | undefined;
  requestRestart?: ((service?: string) => void) | undefined;
};

const READINESS_REQUEST_TIMEOUT = 30_000;

function useControlPlaneServer(
  options: ControlPlaneServerOptions,
): Operation<{ port: number; notifyServiceChange: () => void }> {
  return resource(function* (provide) {
    const scope = yield* useScope();
    let port = 0;
    const readinessWaiters = new Map<
      ServerResponse,
      { done: WithResolvers<void>; onClose: () => void }
    >();

    function respondToReadyWaiter(
      res: ServerResponse,
      statusCode: number,
      body: Record<string, unknown>,
    ) {
      const waiter = readinessWaiters.get(res);
      if (!waiter) return;
      readinessWaiters.delete(res);
      res.off("close", waiter.onClose);
      waiter.done.resolve();
      if (res.destroyed) return;
      const response = JSON.stringify(body);
      res.writeHead(statusCode, {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(response)),
      });
      res.end(response);
    }

    function currentReadiness(): { statusCode: number; body: Record<string, unknown> } | undefined {
      const failed = Array.from(options.services.entries()).find(
        ([, status]) => status.state === "failed" || status.state === "stopping",
      );
      if (failed) {
        return {
          statusCode: 503,
          body: { ready: false, service: failed[0], state: failed[1].state },
        };
      }
      if (Array.from(options.services.values()).every((status) => status.state === "ready")) {
        return { statusCode: 200, body: { ready: true, port } };
      }
      return undefined;
    }

    function notifyServiceChange() {
      const readiness = currentReadiness();
      if (!readiness) return;
      for (const res of readinessWaiters.keys()) {
        respondToReadyWaiter(res, readiness.statusCode, readiness.body);
      }
    }

    function waitForReadiness(res: ServerResponse) {
      const readiness = currentReadiness();
      if (readiness) {
        const body = JSON.stringify(readiness.body);
        res.writeHead(readiness.statusCode, {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(body)),
        });
        res.end(body);
        return;
      }

      const onClose = () => {
        const waiter = readinessWaiters.get(res);
        if (waiter) waiter.done.resolve();
        readinessWaiters.delete(res);
      };
      const waiter = { done: withResolvers<void>(), onClose };
      readinessWaiters.set(res, waiter);
      res.once("close", onClose);

      const task = scope.run(function* () {
        const timedOut = yield* race([
          call(function* () {
            yield* sleep(READINESS_REQUEST_TIMEOUT);
            return true;
          }),
          call(function* () {
            yield* waiter.done.operation;
            return false;
          }),
        ]);
        if (timedOut) {
          respondToReadyWaiter(res, 504, { ready: false, reason: "readiness timed out" });
        }
      });
      void task.catch((error) => console.error("control plane readiness wait failed:", error));
    }

    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "", `http://127.0.0.1`);
        const pathname = url.pathname;

        if (req.method === "GET" && (pathname === "/data" || pathname === "/")) {
          const body = JSON.stringify(options.data);
          res.writeHead(200, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          return;
        }

        if (req.method === "GET" && pathname.startsWith("/data/")) {
          const key = decodeURIComponent(pathname.replace(/^\/data\//, ""));
          if (!key) {
            res.writeHead(400);
            res.end();
            return;
          }

          const value = options.data[key];
          if (value === undefined) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("not found");
            return;
          }

          const body = JSON.stringify(value);
          res.writeHead(200, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          return;
        }

        if (req.method === "GET" && pathname === "/health") {
          const body = JSON.stringify({ ok: true, port });
          res.writeHead(200, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          return;
        }

        if (req.method === "GET" && pathname === "/ready") {
          waitForReadiness(res);
          return;
        }

        if (req.method === "GET" && pathname === "/status") {
          const services = Object.fromEntries(
            Array.from(options.services, ([name, status]) => [name, status.snapshot()]),
          );
          const body = JSON.stringify({
            cwd: process.cwd(),
            services,
          });
          res.writeHead(200, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          return;
        }

        if (req.method === "POST" && pathname === "/stop") {
          if (!options.requestStop) {
            res.writeHead(501, { "content-type": "text/plain" });
            res.end("stop not configured");
            return;
          }

          const body = JSON.stringify({ ok: true, stopping: true });
          res.writeHead(202, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          queueMicrotask(() => options.requestStop?.());
          return;
        }

        if (req.method === "POST" && pathname === "/restart") {
          if (!options.requestRestart) {
            res.writeHead(501, { "content-type": "text/plain" });
            res.end("restart not configured");
            return;
          }

          const service = url.searchParams.get("service") ?? undefined;
          try {
            options.requestRestart(service);
          } catch (error) {
            res.writeHead(400, { "content-type": "text/plain" });
            res.end(String(error));
            return;
          }

          const body = JSON.stringify({ ok: true, restarting: true, service });
          res.writeHead(202, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          return;
        }

        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      } catch (error) {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(String(error));
      }
    });

    yield* listen(server, options.port);
    yield* ensure(function* () {
      for (const res of readinessWaiters.keys()) {
        respondToReadyWaiter(res, 503, { ready: false, reason: "control plane is stopping" });
      }
      if (server.listening) yield* close(server);
      yield* logger.debug(`control plane stopped on port ${port}`);
    });

    const address = server.address();
    port = typeof address === "object" && address !== null && "port" in address ? address.port : 0;
    yield* logger.debug(`control plane started on port ${port}`);
    yield* useAttributes({ name: "controlPlane", port });
    yield* provide({ port, notifyServiceChange });
  });
}

/**
 * Start the local HTTP control plane and its process registry.
 *
 * This is intended for local testing and to supply a small amount of
 * configuration or initialization data to child simulations via the
 * "simulacrum" gateway. The operation yields its control-plane API once listening.
 *
 * @param options - Arbitrary JSON-serializable data to serve at `/data`, plus control settings
 * @returns an operation that provides the control-plane API
 */
export function useControlPlane(options: ControlPlaneOptions = {}): Operation<ControlPlane> {
  return resource(function* (provide) {
    const data = options.data ?? {};
    const reaper: ProcessReaperClient = yield* useProcessReaper();
    const launcher = yield* GraphLauncher.get();
    const services = new Map<string, ServiceStatusRecord>(
      (options.services ?? []).map((name) => [name, new ServiceStatusRecord()]),
    );
    services.set(
      "simulacrum",
      new ServiceStatusRecord({
        pid: process.pid,
        command: {
          executable: process.execPath,
          arguments: [...process.execArgv, ...process.argv.slice(1)],
        },
        launcher,
      }),
    );
    yield* useAttributes({ name: "controlPlane", keys: Object.keys(data).join(", ") });
    // start up the http metadata and data service
    const { port, notifyServiceChange } = yield* useControlPlaneServer({
      data,
      port: options.port,
      services,
      requestStop: options.requestStop,
      requestRestart: options.requestRestart,
    });

    function setServiceInfo(name: string, info: ServiceInfoUpdate) {
      const current = services.get(name) ?? new ServiceStatusRecord();
      current.update(info);
      services.set(name, current);
      notifyServiceChange();
    }

    function clearServiceInfo(name: string, state?: ServiceState) {
      const previous = services.get(name) ?? new ServiceStatusRecord();
      previous.clear(state);
      services.set(name, previous);
      notifyServiceChange();
    }

    function* trackProcess<T extends Process>(
      name: string,
      command: string,
      options: ExecOptions,
      operation: Operation<T>,
    ): Operation<T> {
      let release: ((state?: ServiceState, exit?: ExitStatus) => void) | undefined;
      yield* ensure(() => {
        const current = services.get(name);
        release?.(current?.state === "ready" ? "failed" : undefined);
      });

      const process = yield* operation;
      reaper.add(process.pid);
      setServiceInfo(name, {
        pid: process.pid,
        command: {
          executable: command,
          arguments: options.arguments ?? [],
          ...(options.shell === undefined ? {} : { shell: options.shell }),
        },
      });
      let active = true;
      release = (state?: ServiceState, exit?: ExitStatus) => {
        if (!active) return;
        active = false;
        const current = services.get(name);
        if (current?.pid === process.pid) {
          const requestedSignal = current.snapshot().requestedSignal;
          clearServiceInfo(name, state);
          if (exit) {
            setServiceInfo(name, {
              lastExit: {
                ...(requestedSignal ? { requestedSignal } : {}),
                ...(exit.code == null ? {} : { code: exit.code }),
                ...(exit.signal == null ? {} : { signal: exit.signal }),
              },
              requestedSignal: undefined,
            });
          }
        }
      };
      yield* spawn(function* () {
        let exit: ExitStatus | undefined;
        try {
          exit = yield* process.join();
        } finally {
          reaper.remove(process.pid);
        }
        const current = services.get(name);
        release(current?.state === "ready" ? "failed" : undefined, exit);
      });

      return process;
    }

    setServiceInfo("simulacrum", { port, state: "ready" });

    yield* provide({
      port,
      getServiceStatus: (name) => services.get(name),
      getServiceInfo: (name) => services.get(name)?.snapshot(),
      setServiceInfo,
      clearServiceInfo,
      trackProcess,
    });
  });
}
