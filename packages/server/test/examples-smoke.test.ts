import { it } from "node:test";
import http from "node:http";
import { run, sleep, suspend, createScope, until } from "effection";
import { timebox } from "@effectionx/timebox";

import { services as basicServices } from "../example/operation/basic-graph.ts";
import { services as lifecycleServices } from "../example/operation/lifecycle-hooks.ts";
import { services as concurrencyServices } from "../example/operation/concurrency-layers.ts";

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

import type { ServicesMap } from "../src/services.ts";

it("basic example imports and runs", async () => {
  const runner = basicServices as unknown as any; // runner

  // start the graph and await exported ports in a single run operation
  await run(function* () {
    const [scope, destroy] = createScope();
    scope.run(function* () {
      yield* runner();
      // keep the graph task alive until the scope is destroyed
      yield* suspend();
    });

    // allow spawned graph to attach `exportsOperation` properties
    yield* sleep(0);

    const svcMap: ServicesMap = (basicServices as any).services;
    const ps: number[] = [];
    for (const name of Object.keys(svcMap)) {
      const exportsOp = svcMap[name].exportsOperation;
      if (!exportsOp) throw new Error(`no exportsOperation on ${name}`);
      const val = yield* exportsOp;
      ps.push(val);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preHandles: any[] = (process as any)._getActiveHandles
      ? (process as any)._getActiveHandles()
      : [];
    for (const h of preHandles) {
      try {
        const name = h && h.constructor && h.constructor.name;
        if (name === "Server" && typeof h.close === "function") {
          try {
            h.close();
          } catch (e) {}
        }
      } catch (e) {}
    }
    // give servers a moment to close
    yield* sleep(50);

    // request the graph be shut down and wait for up to 1s for cleanup
    const tb = yield* timebox(1000, () => until(destroy()));
    if (tb.timeout) {
      // eslint-disable-next-line no-console
      console.warn("cleanup timed out for example graph");
    }

    // best-effort: close any remaining socket handles so tests don't hang
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handles: any[] = (process as any)._getActiveHandles
      ? (process as any)._getActiveHandles()
      : [];
    for (const h of handles) {
      try {
        if (typeof h.destroy === "function") h.destroy();
        else if (typeof h.end === "function") h.end();
      } catch (e) {
        // ignore
      }
    }
    // allow handles to close
    yield* sleep(20);

    return ps as number[];
  });
});

it("lifecycle example imports and runs", async () => {
  const runner = lifecycleServices as unknown as any; // runner

  await run(function* () {
    const [scope, destroy] = createScope();
    scope.run(function* () {
      yield* runner();
      // keep the graph task alive until the scope is destroyed
      yield* suspend();
    });

    // allow spawned graph to attach `exportsOperation` properties
    yield* sleep(0);

    const svcMap: ServicesMap = (lifecycleServices as any).services;
    const ps: number[] = [];
    for (const name of Object.keys(svcMap)) {
      const exportsOp = svcMap[name].exportsOperation;
      if (!exportsOp) throw new Error(`no exportsOperation on ${name}`);
      ps.push(yield* exportsOp);
    }

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
          `(examples-smoke lifecycle) port ${p} did not return 200 while graph was running`
        );
      }
    }

    // shut down the graph to avoid hanging the test process
    yield* until(destroy());
    return ps as number[];
  });

  // nothing to check here; checks already happened while graph was running
});

it("concurrency example imports and runs", async () => {
  const runner = concurrencyServices as unknown as any; // runner

  await run(function* () {
    const [scope, destroy] = createScope();
    scope.run(function* () {
      yield* runner();
      // keep the graph task alive until the scope is destroyed
      yield* suspend();
    });

    // allow spawned graph to attach `exportsOperation` properties
    yield* sleep(0);

    const svcMap: ServicesMap = (concurrencyServices as any).services;
    const ps: number[] = [];
    for (const name of Object.keys(svcMap)) {
      const exportsOp = svcMap[name].exportsOperation;
      if (!exportsOp) throw new Error(`no exportsOperation on ${name}`);
      ps.push(yield* exportsOp);
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
