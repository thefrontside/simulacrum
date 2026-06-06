import { resource, type Operation, withResolvers } from "effection";
import { useAttributes } from "./logging.ts";
import { createServer } from "node:http";
import { logger } from "./logging.ts";
import type { Server } from "node:http";

export type DataServiceOptions = {
  data?: Record<string, unknown>;
  port?: number | undefined;
  getStatus?: () => unknown;
  requestStop?: (() => void) | undefined;
  requestRestart?: ((service?: string) => void) | undefined;
};

function* listen(server: Server, port: number | undefined): Operation<void> {
  const ready = withResolvers<void>("wait for data service to start listening");

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
  const closed = withResolvers<void>("wait for data service to stop listening");

  server.close((error) => {
    if (error) {
      closed.reject(error);
    } else {
      closed.resolve();
    }
  });

  yield* closed.operation;
}

/**
 * Start a simple local HTTP data service that serves a user-provided object.
 *
 * This is intended for local testing and to supply a small amount of
 * configuration or initialization data to child simulations via the
 * "simulacrum" gateway. The operation yields an object with `{ port }` once
 * listening.
 *
 * @param options - Arbitrary JSON-serializable data to serve at `/data`, plus optional control settings
 * @returns an operation that provides `{ port: number }` when ready
 */
export function startDataService(options: DataServiceOptions = {}): Operation<{ port: number }> {
  return resource(function* (provide) {
    const data = options.data ?? {};
    let port = 0;
    yield* useAttributes({
      name: "dataService",
      keys: Object.keys(data).join(", "),
    });
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "", `http://127.0.0.1`);
        const pathname = url.pathname;

        // GET /data -> whole object
        if (req.method === "GET" && (pathname === "/data" || pathname === "/")) {
          const body = JSON.stringify(data || {});
          res.writeHead(200, {
            "content-type": "application/json",
            "content-length": String(Buffer.byteLength(body)),
          });
          res.end(body);
          return;
        }

        // GET /data/<key> -> value or 404
        if (req.method === "GET" && pathname.startsWith("/data/")) {
          const key = decodeURIComponent(pathname.replace(/^\/data\//, ""));
          if (!key) {
            res.writeHead(400);
            res.end();
            return;
          }

          const value = (data as Record<string, unknown> | undefined)?.[key];
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
          const body = JSON.stringify(options.getStatus?.() ?? {});
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

        // unknown endpoint
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      } catch (err) {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(String(err));
      }
    });

    // listen on ephemeral port bound to localhost
    yield* listen(server, options.port);

    const address = server.address();
    port = typeof address === "object" && address !== null && "port" in address ? address.port : 0;

    yield* logger.debug(`data service started on port ${port}`);
    yield* useAttributes({ name: "dataService", port });

    try {
      yield* provide({ port });
    } finally {
      yield* close(server);
      yield* logger.debug(`data service stopped on port ${port}`);
    }
  });
}
