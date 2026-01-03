import { it } from "node:test";
import { run, spawn, sleep, suspend, until, createScope } from "effection";
import { services as dataServices } from "../example/operation/data-sharing.ts";

import { useServiceGraph } from "../src/services.ts";
import http from "node:http";

// log any uncaught errors so we can debug failing teardown
// eslint-disable-next-line no-console
process.on("uncaughtException", (err) =>
  console.error("uncaughtException in test:", err)
);
// eslint-disable-next-line no-console
process.on("unhandledRejection", (reason) =>
  console.error("unhandledRejection in test:", reason)
);

it("data sharing: short-lived provider and dependent services", async () => {
  // create scope at test level so we can control shutdown after assertions
  const [scope, destroy] = createScope();

  try {
    const results = await run(function* () {
      // start the graph in the provided scope
      const runner = dataServices as unknown as any; // runner
      scope.run(function* () {
        yield* runner();
        // keep the graph task alive until the scope is destroyed
        yield* suspend();
      });

      // yield so spawned children get scheduled and exportsOperations are available
      yield* sleep(0);

      const svcMap: any = (dataServices as any).services;
      const res: any = {};
      res.data = yield* svcMap.data.exportsOperation;
      res.a = yield* svcMap.serviceA.exportsOperation;
      res.b = yield* svcMap.serviceB.exportsOperation;
      res.c = yield* svcMap.serviceC.exportsOperation;

      // ensure the simulator is reachable while still in the run scope
      res.simulatorSeed = undefined as number | undefined;
      for (let i = 0; i < 100; i++) {
        try {
          const fetched = yield* until(
            new Promise<number>((resolve, reject) => {
              const req = http.get(
                {
                  hostname: "127.0.0.1",
                  port: res.a.port,
                  path: "/info",
                  agent: false,
                },
                (r: any) => {
                  let body = "";
                  r.on("data", (c: any) => (body += c));
                  r.on("end", () => {
                    try {
                      const json = JSON.parse(body);
                      if (typeof json.seed === "number") {
                        resolve(json.seed as number);
                        return;
                      }
                      reject(new Error("no seed"));
                    } catch (err) {
                      reject(err);
                    }
                  });
                }
              );
              req.on("error", reject);
            })
          );
          res.simulatorSeed = fetched;
          break;
        } catch (err) {
          yield* sleep(10);
        }
      }

      return res;
    });

    if (results.data.seed !== 42) throw new Error("data seed mismatch");
    if (results.a.handledWith !== 42)
      throw new Error("serviceA did not get data");
    if (results.b.used !== 42)
      throw new Error("serviceB did not get serviceA's export");
    if (results.c.dataMessage !== "hello from data")
      throw new Error("serviceC did not get data message");

    // verify that the foundation simulator created by serviceA is reachable
    if (typeof results.a.port !== "number")
      throw new Error("serviceA did not expose port");

    // ensure the simulator returned the expected seed while the scope was active
    if (results.simulatorSeed !== 42)
      throw new Error("simulator /info did not return expected seed");
  } catch (err) {
    console.error("data-sharing test error:", err);
    throw err;
  } finally {
    console.log("data-sharing test cleanup: starting");

    // best-effort: close any Server handles first so servers stop accepting
    // connections and their finalizers can complete during destroy.
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
    await new Promise((r) => setTimeout(r, 50));
    console.log("data-sharing test cleanup: closed preHandles");

    // ensure destroy completes within 10s for debugging
    await Promise.race([destroy(), new Promise((r) => setTimeout(r, 10000))]);
    console.log("data-sharing test cleanup: destroy completed (or timed out)");

    // best-effort: close any remaining socket handles so the test process exits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handles: any[] = (process as any)._getActiveHandles
      ? (process as any)._getActiveHandles()
      : [];
    // log of handles removed; we attempt to close/destroy remaining handles below
    for (const h of handles) {
      try {
        if (typeof h.destroy === "function") h.destroy();
        else if (typeof h.end === "function") h.end();
      } catch (e) {
        // ignore
      }
    }
    // allow handles to close
    await new Promise((r) => setTimeout(r, 20));
    console.log("data-sharing test: completed OK");
  }
});

it("exportsOperation rejects when provider throws", async () => {
  console.log("exportsOperation rejects test: start");
  const services = {
    data: {
      operation: (function* () {
        throw new Error("boom");
      })(),
    },
    dependent: {
      deps: ["data"],
      operation: (function* () {
        return (yield* (services as any).data.exportsOperation) as any;
      })(),
    },
  } as any;

  await run(function* () {
    yield* spawn(function* () {
      try {
        const run = useServiceGraph(services as any);
        // start only the 'data' service so dependents don't consume the rejection
        yield* run(["data"]);
      } catch (err) {
        // swallow; the test will observe rejection via exportsOperation
      }
    });

    yield* sleep(0);

    const op = services.data.exportsOperation;
    // eslint-disable-next-line no-console
    console.log(
      "exportsOperation typeof",
      typeof op,
      "isIterator",
      !!(op && typeof op.next === "function"),
      "op",
      op
    );
    // timebox waiting for exportsOperation to reject to accommodate scheduler timing
    let caught = false;
    // eslint-disable-next-line no-console
    console.log("exportsOperation waiting for rejection (timeboxed)");
    for (let i = 0; i < 100; i++) {
      try {
        yield* (services as any).data.exportsOperation;
        // if it resolves, that's unexpected; break to the final check
        // eslint-disable-next-line no-console
        console.log("exportsOperation unexpectedly resolved");
        break;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.log(
          "exportsOperation attempt rejected with",
          err && err.message
        );
        if (err && err.message === "boom") {
          caught = true;
          break;
        }
        throw err;
      } finally {
        if (!caught) {
          // give scheduler a bit of time to make progress
          yield* sleep(1);
        }
      }
    }

    if (!caught) throw new Error("expected exportsOperation to reject");
  });
});
