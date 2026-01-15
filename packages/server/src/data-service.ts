import { call, resource, type Operation } from "effection";
import { createServer } from "node:http";
import { stdout } from "./logging.ts";

export type DataServiceOptions = Record<string, unknown> | undefined;

/**
 * Start a simple local HTTP data service that serves a user-provided object.
 *
 * This is intended for local testing and to supply a small amount of
 * configuration or initialization data to child simulations via the
 * "simulacrum" gateway. The operation yields an object with `{ port }` once
 * listening.
 *
 * @param data - Arbitrary JSON-serializable data to serve at `/data`
 * @returns an operation that provides `{ port: number }` when ready
 */
export function startDataService(
  data: DataServiceOptions = {}
): Operation<{ port: number }> {
  return resource(function* (provide) {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? "", `http://127.0.0.1`);
        const pathname = url.pathname;

        // GET /data -> whole object
        if (
          req.method === "GET" &&
          (pathname === "/data" || pathname === "/")
        ) {
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

        // unknown endpoint
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      } catch (err) {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end(String(err));
      }
    });

    // listen on ephemeral port bound to localhost
    yield* call(() => server.listen());

    const address = server.address();
    const port =
      typeof address === "object" && address !== null && "port" in address
        ? address.port
        : 0;

    yield* stdout(`data service: started on port ${port}`);

    try {
      yield* provide({ port });
    } finally {
      yield* call(() => server.close());
      yield* stdout(`data service: stopped on port ${port}`);
    }
  });
}
