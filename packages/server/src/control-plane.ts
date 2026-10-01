import { ensure, resource, spawn, type Operation, withResolvers } from "effection";
import type { Process } from "@effectionx/process";
import { useAttributes } from "./logging.ts";
import { createServer } from "node:http";
import { logger } from "./logging.ts";
import type { Server } from "node:http";
import { type ProcessReaperClient, useProcessReaper } from "./reaper.ts";

export type ServiceState = "waiting" | "starting" | "ready" | "stopping" | "failed";

export type ControlPlaneServiceInfo = {
  state: ServiceState;
  port?: number | undefined;
  pid?: number | undefined;
};

export type ControlPlaneOptions = {
  data?: Record<string, unknown>;
  port?: number | undefined;
  services?: readonly string[];
  requestStop?: (() => void) | undefined;
  requestRestart?: ((service?: string) => void) | undefined;
};

export type ControlPlane = {
  port: number;
  getServiceInfo: (name: string) => ControlPlaneServiceInfo | undefined;
  setServiceInfo: (name: string, info: Partial<ControlPlaneServiceInfo>) => void;
  clearServiceInfo: (name: string, state?: ServiceState) => void;
  trackProcess: (name: string, process: Operation<Process>) => Operation<Process>;
};

function* listen(server: Server, port: number | undefined): Operation<void> {
  const ready = withResolvers<void>("wait for control plane to start listening");

  const onError = (error: Error) => {
    server.off("listening", onListening);
    ready.reject(error);
  };
  const onListening = () => {
    server.off("error", onError);
    ready.resolve();
  };

  server.once("error", onError);
  server.once("listening", onListening);
  server.listen(port ?? 0, "127.0.0.1");

  try {
    yield* ready.operation;
  } finally {
    server.off("error", onError);
    server.off("listening", onListening);
  }
}

function* close(server: Server): Operation<void> {
  const closed = withResolvers<void>("wait for control plane to stop listening");

  server.close((error) => {
    if (error) {
      closed.reject(error);
    } else {
      closed.resolve();
    }
  });

  yield* closed.operation;
}

type ControlPlaneServerOptions = {
  data: Record<string, unknown>;
  port: number | undefined;
  services: Map<string, ControlPlaneServiceInfo>;
  requestStop?: (() => void) | undefined;
  requestRestart?: ((service?: string) => void) | undefined;
};

function useControlPlaneServer(options: ControlPlaneServerOptions): Operation<{ port: number }> {
  return resource(function* (provide) {
    let port = 0;
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

        if (req.method === "GET" && pathname === "/status") {
          const body = JSON.stringify({
            cwd: process.cwd(),
            services: Object.fromEntries(options.services),
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
      if (server.listening) yield* close(server);
      yield* logger.debug(`control plane stopped on port ${port}`);
    });

    const address = server.address();
    port = typeof address === "object" && address !== null && "port" in address ? address.port : 0;
    yield* logger.debug(`control plane started on port ${port}`);
    yield* useAttributes({ name: "controlPlane", port });
    yield* provide({ port });
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
    const services = new Map<string, ControlPlaneServiceInfo>(
      (options.services ?? []).map((name) => [name, { state: "waiting" }]),
    );
    function setServiceInfo(name: string, info: Partial<ControlPlaneServiceInfo>) {
      const current = services.get(name) ?? { state: "waiting" as const };
      if (info.pid !== undefined && current.pid !== info.pid) {
        if (current.pid !== undefined) reaper.remove(current.pid);
        reaper.add(info.pid);
      }
      if ("pid" in info && info.pid === undefined && current.pid !== undefined) {
        reaper.remove(current.pid);
        delete current.pid;
      }
      if (info.pid !== undefined) current.pid = info.pid;
      if (info.port !== undefined) current.port = info.port;
      if (info.state !== undefined) current.state = info.state;
      services.set(name, current);
    }

    function clearServiceInfo(name: string, state?: ServiceState) {
      const previous = services.get(name);
      if (previous?.pid !== undefined) reaper.remove(previous.pid);
      if (previous) {
        delete previous.port;
        delete previous.pid;
        if (state !== undefined) previous.state = state;
      } else {
        services.set(name, { state: state ?? "waiting" });
      }
    }

    function registerProcess(name: string, pid: number): () => void {
      setServiceInfo(name, { pid });
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (services.get(name)?.pid === pid) {
          clearServiceInfo(name);
        }
      };
    }

    function* trackProcess(name: string, operation: Operation<Process>): Operation<Process> {
      let release: (() => void) | undefined;
      yield* ensure(() => {
        release?.();
      });

      const process = yield* operation;
      release = registerProcess(name, process.pid);
      yield* spawn(function* () {
        yield* process.join();
        release?.();
      });

      return process;
    }
    yield* useAttributes({ name: "controlPlane", keys: Object.keys(data).join(", ") });
    const { port } = yield* useControlPlaneServer({
      data,
      port: options.port,
      services,
      requestStop: options.requestStop,
      requestRestart: options.requestRestart,
    });
    setServiceInfo("simulacrum", { port, state: "ready" });

    yield* provide({
      port,
      getServiceInfo: (name) => services.get(name),
      setServiceInfo,
      clearServiceInfo,
      trackProcess,
    });
  });
}
