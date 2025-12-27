import http from "node:http";
import type { Operation } from "effection";
import { sleep, suspend, resource, withResolvers } from "effection";

export type HttpServerOptions = {
  port?: number;
  startDelay?: number; // ms
};

export function httpServer(options: HttpServerOptions = {}): Operation<void> {
  return resource(function* () {
    if (options.startDelay) {
      yield* sleep(options.startDelay);
    }

    const port = options.port ?? 0;
    const server = http.createServer((req, res) => {
      if (req.url === "/status") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("ok");
        return;
      }
      res.writeHead(404);
      res.end();
    });

    const ready = withResolvers<void>();
    server.listen(port, () => {
      const address = server.address() as any;
      const p = typeof address === "object" && address ? address.port : port;
      console.log(`http server started on port ${p}`);
      ready.resolve();
    });
    server.on("error", (err) => ready.reject(err as Error));

    // wait for server to be listening
    yield* ready.operation;

    try {
      yield* suspend();
    } finally {
      server.close();
    }
  }) as Operation<void>;
}
