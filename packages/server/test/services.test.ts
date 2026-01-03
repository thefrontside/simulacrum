import { it } from "node:test";
import assert from "node:assert";
import { run, sleep, spawn, Ok, suspend, type Operation } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useService } from "../src/service.ts";

it("starts services in dependency order", async () => {
  const startTimes = new Map<string, number>();
  try {
    await run(function* () {
      yield* spawn(function* () {
        const run = useServiceGraph({
          A: {
            operation: useService(
              "A",
              "node --import tsx ./test/services/service-a.ts",
              {
                wellnessCheck: {
                  frequency: 10,
                  *operation(_stdio) {
                    yield* sleep(20);
                    startTimes.set("A", Date.now());
                    return Ok<void>(void 0);
                  },
                },
              }
            ),
          },
          B: {
            operation: useService(
              "B",
              "node --import tsx ./test/services/service-b.ts",
              {
                wellnessCheck: {
                  frequency: 10,
                  *operation(_stdio) {
                    yield* sleep(40);
                    startTimes.set("B", Date.now());
                    return Ok<void>(void 0);
                  },
                },
              }
            ),
            deps: ["A"],
          },
        });
        yield* run();
      });
      // The graph is running; sleep a short time to let the services start
      yield* sleep(200);
    });
  } catch (err) {
    console.log("run error:", err instanceof Error ? err.stack : err);
  }

  const aStarted = startTimes.get("A");
  const bStarted = startTimes.get("B");
  assert.ok(typeof aStarted === "number", "A started should be recorded");
  assert.ok(typeof bStarted === "number", "B started should be recorded");
  assert(aStarted! <= bStarted!, "A should start before B");
});

it("throws on cycles in dependency graph", async () => {
  await assert.rejects(async () => {
    await run(function* () {
      const runGraph = useServiceGraph({
        A: {
          operation: useService(
            "A",
            "node --import tsx ./test/services/service-a.ts"
          ),
          deps: ["B"],
        },
        B: {
          operation: useService(
            "B",
            "node --import tsx ./test/services/service-b.ts"
          ),
          deps: ["A"],
        },
      });
      yield* runGraph();
    });
  }, /Cycle detected in services/);
});

it("runs beforeStop hooks in reverse order", async () => {
  const stopOrder: string[] = [];
  const startedOrder: string[] = [];
  await run(function* () {
    // spawn and cancel automatically when run returns
    yield* spawn(function* () {
      const run = useServiceGraph({
        A: {
          operation: useService(
            "A",
            "node --import tsx ./test/services/service-a.ts",
            {
              wellnessCheck: {
                frequency: 10,
                *operation(_stdio) {
                  yield* sleep(20);
                  startedOrder.push("A");
                  return Ok<void>(void 0);
                },
              },
            }
          ),
          beforeStop() {
            return (function* () {
              stopOrder.push("A");
            })() as unknown as Operation<void>;
          },
        },
        B: {
          operation: useService(
            "B",
            "node --import tsx ./test/services/service-b.ts",
            {
              wellnessCheck: {
                frequency: 10,
                *operation(_stdio) {
                  yield* sleep(40);
                  startedOrder.push("B");
                  return Ok<void>(void 0);
                },
              },
            }
          ),
          deps: ["A"],
          beforeStop() {
            return (function* () {
              stopOrder.push("B");
            })() as unknown as Operation<void>;
          },
        },
      });
      yield* run();
    });
    // let them start
    yield* sleep(200);
  });
  assert.strictEqual(startedOrder.join(""), "AB");
  assert.strictEqual(stopOrder.join(""), "BA");
});

it("starts independent services in parallel", async () => {
  const startTimes = new Map<string, number>();
  try {
    await run(function* () {
      yield* spawn(function* () {
        const run = useServiceGraph({
          fast: {
            operation: useService(
              "fast",
              "node --import tsx ./test/services/service-fast.ts",
              {
                wellnessCheck: {
                  frequency: 10,
                  *operation(_stdio) {
                    yield* sleep(20);
                    startTimes.set("fast", Date.now());
                    return Ok<void>(void 0);
                  },
                },
              }
            ),
          },
          slow: {
            operation: useService(
              "slow",
              "node --import tsx ./test/services/service-slow.ts",
              {
                wellnessCheck: {
                  frequency: 10,
                  *operation(_stdio) {
                    yield* sleep(50);
                    startTimes.set("slow", Date.now());
                    return Ok<void>(void 0);
                  },
                },
              }
            ),
          },
        });
        yield* run();
      });
      yield* sleep(250);
    });
    const fastStarted = startTimes.get("fast");
    const slowStarted = startTimes.get("slow");
    assert.ok(
      typeof fastStarted === "number",
      "fast started should be recorded"
    );
    assert.ok(
      typeof slowStarted === "number",
      "slow started should be recorded"
    );
    assert(fastStarted! <= slowStarted!, "fast should start before slow");
  } finally {
    // cleanup
  }
});

it("runs subset of services with dependencies", async () => {
  const startTimes = new Map<string, number>();
  await run(function* () {
    yield* spawn(function* () {
      const services = {
        fast: {
          operation: useService(
            "fast",
            "node --import tsx ./test/services/service-fast.ts",
            {
              wellnessCheck: {
                frequency: 10,
                *operation(_stdio) {
                  yield* sleep(20);
                  startTimes.set("fast", Date.now());
                  return Ok<void>(void 0);
                },
              },
            }
          ),
        },
        slow: {
          operation: useService(
            "slow",
            "node --import tsx ./test/services/service-slow.ts",
            {
              wellnessCheck: {
                frequency: 10,
                *operation(_stdio) {
                  yield* sleep(50);
                  startTimes.set("slow", Date.now());
                  return Ok<void>(void 0);
                },
              },
            }
          ),
        },
        dependent: {
          deps: ["fast", "slow"],
          operation: (function* () {
            startTimes.set("dependent", Date.now());
            yield* suspend();
          })() as unknown as Operation<void>,
        },
      } as any;

      // only request dependent; fast and slow should be included as deps
      const run = useServiceGraph(services);
      yield* run(["dependent"]);
    });
    yield* sleep(300);
  });

  const f = startTimes.get("fast");
  const s = startTimes.get("slow");
  const d = startTimes.get("dependent");
  assert.ok(typeof f === "number", "fast should start");
  assert.ok(typeof s === "number", "slow should start");
  assert.ok(typeof d === "number", "dependent should start");
  assert(f! <= d!, "fast should start before dependent");
  assert(s! <= d!, "slow should start before dependent");
});
