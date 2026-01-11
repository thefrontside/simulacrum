import { it } from "node:test";
import http from "node:http";
import { run, sleep, suspend, createScope, until } from "effection";
import { timebox } from "@effectionx/timebox";

import { services as basicServices } from "../example/simulation-graph.ts";
import { services as concurrencyServices } from "../example/concurrency-layers.ts";

function checkStatus(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: "/status", agent: false },
      (res) => {
        resolve(res.statusCode ?? 0);
      }
    );
    req.on("error", reject);
  });
}

import type { ServiceGraph } from "../src/services.ts";
import type { Operation } from "effection";

it("basic example imports and runs", async () => {
  const runner = basicServices as unknown as () => Operation<
    ServiceGraph<Record<string, unknown>>
  >; // runner
  let provided: any;

  // start the graph and await exported ports in a single run operation
  await run(function* () {
    const [scope, destroy] = createScope();
    // start operation-style graph and capture provided resource synchronously
    try {
      provided = yield* runner();
    } catch (err) {
      console.error(
        "example runner threw:",
        err instanceof Error ? err.stack : err
      );
      throw err;
    }
    // keep the graph task alive until the scope is destroyed
    scope.run(function* () {
      yield* suspend();
    });

    // allow spawned graph to settle and for services to register their ports
    yield* sleep(0);

    const svcMap = provided!.services;
    const ports = provided!.servicePorts!;
    const ps: number[] = [];
    for (const name of Object.keys(svcMap)) {
      const port = ports!.get(name);
      if (typeof port === "number") ps.push(port);
    }

    // keep the graph alive briefly to allow HTTP checks
    yield* sleep(200);

    // check each port while the graph is still running
    for (const p of ps) {
      let ok = false;
      for (let i = 0; i < 100; i++) {
        try {
          const status = yield* until(checkStatus(p));
          if (status === 200) {
            ok = true;
            break;
          }
        } catch (_) {}
        yield* sleep(10);
      }
      if (!ok) {
        throw new Error(
          `(examples-smoke basic) port ${p} did not return 200 while graph was running`
        );
      }
    }

    // best-effort: close any Server handles before requesting shutdown
    const _getActiveHandles = (
      process as unknown as { _getActiveHandles?: () => unknown[] }
    )._getActiveHandles;
    const preHandles: unknown[] = _getActiveHandles ? _getActiveHandles() : [];

    for (const h of preHandles) {
      try {
        const name = (h as { constructor?: { name?: string } })?.constructor
          ?.name;
        if (name === "Server") {
          const maybeClose = (h as { close?: unknown }).close;
          if (typeof maybeClose === "function") {
            try {
              (maybeClose as () => void)();
            } catch (e) {}
          }
        }
      } catch (e) {}
    }
    // give servers a moment to close
    yield* sleep(50);

    // request the graph be shut down and wait for up to 1s for cleanup
    const tb = yield* timebox(1000, () => until(destroy()));
    if (tb.timeout) {
      console.warn("cleanup timed out for example graph");
    }

    // best-effort: close any remaining socket handles so tests don't hang
    const _getActiveHandles2 = (
      process as unknown as { _getActiveHandles?: () => unknown[] }
    )._getActiveHandles;
    const handles: unknown[] = _getActiveHandles2 ? _getActiveHandles2() : [];
    for (const h of handles) {
      try {
        const maybeDestroy = (h as { destroy?: unknown }).destroy;
        if (typeof maybeDestroy === "function") {
          (maybeDestroy as () => void)();
          continue;
        }
        const maybeEnd = (h as { end?: unknown }).end;
        if (typeof maybeEnd === "function") {
          (maybeEnd as () => void)();
        }
      } catch (e) {
        // ignore
      }
    }
    // allow handles to close
    yield* sleep(20);

    return ps as number[];
  });
});

it("concurrency example imports and runs", async () => {
  const runner = concurrencyServices as unknown as () => Operation<
    ServiceGraph<Record<string, unknown>>
  >; // runner
  let provided: ServiceGraph<Record<string, unknown>> | undefined;

  await run(function* () {
    const [scope, destroy] = createScope();
    // start operation-style graph and capture provided resource synchronously
    try {
      provided = yield* runner();
    } catch (err) {
      console.error(
        "example runner threw:",
        err instanceof Error ? err.stack : err
      );
      throw err;
    }
    // keep the graph task alive until the scope is destroyed
    scope.run(function* () {
      yield* suspend();
    });

    // allow spawned graph to settle and for services to register their ports
    yield* sleep(0);

    const svcMap = provided!.services;
    const ports = provided!.servicePorts!;
    const ps: number[] = [];
    for (const name of Object.keys(svcMap)) {
      const port = ports!.get(name);
      if (typeof port === "number") ps.push(port);
    }

    yield* sleep(200);

    // check each port while the graph is still running
    for (const p of ps) {
      if (typeof p !== "number") {
        continue;
      }
      let ok = false;
      for (let i = 0; i < 100; i++) {
        try {
          const status = yield* until(checkStatus(p));
          if (status === 200) {
            ok = true;
            break;
          }
        } catch (_) {}
        yield* sleep(10);
      }
      if (!ok) {
        throw new Error(
          `(examples-smoke concurrency) port ${p} did not return 200 while graph was running`
        );
      }
    }

    // shut down the graph to avoid hanging the test process
    yield* until(destroy());
    return ps as number[];
  });

  // nothing to check here; checks already happened while graph was running
});
