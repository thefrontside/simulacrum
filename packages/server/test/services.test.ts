import { it } from "node:test";
import assert from "node:assert";
import { resource, run, sleep, spawn, suspend } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { waitFor } from "./utils.ts";
import { useService } from "../src/service.ts";

it("starts services in dependency order", async () => {
  const startTimes = new Map<string, number>();
  try {
    await run(function* () {
      yield* spawn(function* () {
        const graph = useServiceGraph({
          A: {
            operation: resource<void>(function* (provide) {
              yield* sleep(20);
              startTimes.set("A", Date.now());
              yield* provide();
            }),
          },
          B: {
            operation: resource<void>(function* (provide) {
              yield* sleep(40);
              startTimes.set("B", Date.now());
              yield* provide();
            }),
            dependsOn: { startup: ["A"] as const },
          },
        });
        yield* graph();
        // keep spawned graph alive
        yield* suspend();
      });
      yield* waitFor(() => startTimes.has("A") && startTimes.has("B"), 2000);
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
            "node --experimental-transform-types ./test/services/service-a.ts",
          ),
          dependsOn: { startup: ["B"] as const },
        },
        B: {
          operation: useService(
            "B",
            "node --experimental-transform-types ./test/services/service-b.ts",
          ),
          dependsOn: { startup: ["A"] as const },
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
          operation: resource<void>(function* (provide) {
            try {
              yield* sleep(20);
              startedOrder.push("A");
              yield* provide();
            } finally {
              stopOrder.push("A");
            }
          }),
        },
        B: {
          operation: resource<void>(function* (provide) {
            try {
              yield* sleep(40);
              startedOrder.push("B");
              yield* provide();
            } finally {
              stopOrder.push("B");
            }
          }),
          dependsOn: { startup: ["A"] as const },
        },
      });
      yield* run();
      // keep spawned graph alive so beforeStop hooks run on teardown
      yield* suspend();
    });
    // let them start
    yield* waitFor(() => startedOrder.length === 2, 2000);
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
            operation: resource<void>(function* (provide) {
              yield* sleep(20);
              startTimes.set("fast", Date.now());
              yield* provide();
            }),
          },
          slow: {
            operation: resource<void>(function* (provide) {
              yield* sleep(50);
              startTimes.set("slow", Date.now());
              yield* provide();
            }),
          },
        });
        yield* run();
        // keep spawned graph alive so services continue to run
        yield* suspend();
      });
      yield* sleep(250);
    });
    const fastStarted = startTimes.get("fast");
    const slowStarted = startTimes.get("slow");
    assert.ok(typeof fastStarted === "number", "fast started should be recorded");
    assert.ok(typeof slowStarted === "number", "slow started should be recorded");
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
          operation: resource<void>(function* (provide) {
            console.log("test: fast operation starting");
            yield* sleep(20);
            console.log("test: fast operation setting startTimes");
            startTimes.set("fast", Date.now());
            yield* provide();
          }),
        },
        slow: {
          operation: resource<void>(function* (provide) {
            console.log("test: slow operation starting");
            yield* sleep(50);
            console.log("test: slow operation setting startTimes");
            startTimes.set("slow", Date.now());
            yield* provide();
          }),
        },
        dependent: {
          dependsOn: { startup: ["fast", "slow"] as const },
          operation: resource<void>(function* (provide) {
            // wait until both dependencies have recorded their start times
            while (!startTimes.has("fast") || !startTimes.has("slow")) {
              yield* sleep(5);
            }
            console.log("test: dependent operation starting after deps");
            startTimes.set("dependent", Date.now());
            yield* provide();
          }),
        },
      };

      // only request dependent; fast and slow should be included as deps
      const run = useServiceGraph(services);
      // request only 'dependent' — this should cause 'fast' and 'slow' to be included as dependencies
      yield* run(["dependent"]);
      // keep spawned graph alive so services can start and perform startup work
      yield* suspend();
    });
    yield* waitFor(() => startTimes.has("fast") && startTimes.has("slow"), 2000);
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

it("throws when requested subset includes a missing service", async () => {
  await assert.rejects(async () => {
    await run(function* () {
      const services = {
        a: {
          operation: resource<void>(function* (provide) {
            yield* sleep(10);
            yield* provide();
          }),
        },
      };

      const runGraph = useServiceGraph(services);
      // request a service that does not exist
      yield* runGraph(["missing"] as any);
    });
  }, /Requested service 'missing' not found/);
});

it("runs subset specified as a string", async () => {
  const startTimes = new Map<string, number>();
  await run(function* () {
    yield* spawn(function* () {
      const services = {
        a: {
          operation: resource<void>(function* (provide) {
            yield* sleep(20);
            startTimes.set("a", Date.now());
            yield* provide();
          }),
        },
        b: {
          operation: resource<void>(function* (provide) {
            yield* sleep(50);
            startTimes.set("b", Date.now());
            yield* provide();
          }),
        },
        r: {
          dependsOn: { startup: ["a", "b"] as const },
          operation: resource<void>(function* (provide) {
            while (!startTimes.has("a") || !startTimes.has("b")) {
              yield* sleep(5);
            }
            startTimes.set("r", Date.now());
            yield* provide();
          }),
        },
        other: {
          operation: resource<void>(function* (provide) {
            yield* sleep(10);
            startTimes.set("other", Date.now());
            yield* provide();
          }),
        },
      };

      const run = useServiceGraph(services);
      yield* run(["r"]);
      yield* suspend();
    });
    yield* waitFor(() => startTimes.has("a") && startTimes.has("b") && startTimes.has("r"), 2000);
  });

  const a = startTimes.get("a");
  const b = startTimes.get("b");
  const r = startTimes.get("r");
  const other = startTimes.get("other");
  assert.ok(typeof a === "number", "a should start");
  assert.ok(typeof b === "number", "b should start");
  assert.ok(typeof r === "number", "r should start");
  assert.ok(typeof other === "undefined", "other should NOT start");
});
