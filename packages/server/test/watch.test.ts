import { it } from "node:test";
import assert from "node:assert";
import { run, suspend, sleep, until, spawn, resource } from "effection";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { useServiceGraph } from "../src/services.ts";
import { simulation } from "./fixtures/simple-sim.ts";
import { useSimulation } from "../src/simulation.ts";

it("restarts services on watched file change and restarts dependents", async () => {
  const prefix = path.join(os.tmpdir(), "sim-watch-");
  // create a temporary directory to hold test files
  const dir = await fs.mkdtemp(prefix);
  const trigger = path.join(dir, "trigger.txt");

  // initial trigger file
  await fs.writeFile(trigger, "initial");

  const updates: string[] = [];
  await run(function* () {
    yield* spawn(function* () {
      // start the graph and enable watch mode
      const op = useServiceGraph(
        {
          a: {
            watch: [dir],
            operation: useSimulation("test-simulation-a", () =>
              simulation(5500)
            ),
          },
          b: {
            dependsOn: { startup: ["a"] as const },
            operation: useSimulation("test-simulation-a", () =>
              simulation(5501)
            ),
          },
        },
        { watch: true, watchDebounce: 20 }
      );

      try {
        const services = yield* op();
        // subscribe to the immediate serviceUpdates stream and wait for the first update
        if (!services.serviceUpdates)
          throw new Error("serviceUpdates not available");
        const subscription = yield* services.serviceUpdates;

        // wait for the first update (will occur after the test touches the file)
        const first = yield* subscription.next();
        updates.push(String((first.value as { service: string }).service));
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // allow initial startup and wait for bOut to appear
    for (let i = 0; i < 200; i++) {
      try {
        yield* until(fs.readFile(trigger, "utf8"));
        break;
      } catch (err) {
        yield* sleep(20);
      }
    }

    // give the spawned subscription a moment to attach
    yield* sleep(50);
    // touch the trigger file to cause a restart
    yield* until(fs.writeFile(trigger, "changed"));
    // give watcher/poller a moment
    yield* sleep(100);
  });

  // remove tmp dir
  await fs.rm(dir, { recursive: true, force: true });

  assert(updates.length >= 1, "expected at least one update");
  assert(updates[0] === "a", "first update is service 'a'");
});

it("restarts dependents when watched service changes", async () => {
  const prefix = path.join(os.tmpdir(), "sim-watch-rt-");
  const dir = await fs.mkdtemp(prefix);
  const trigger = path.join(dir, "trigger.txt");
  await fs.writeFile(trigger, "initial");

  const startCounts: Record<string, number> = { a: 0, b: 0 };

  await run(function* () {
    yield* spawn(function* () {
      const op = useServiceGraph(
        {
          a: {
            watch: [dir],
            operation: resource<void>(function* (provide) {
              startCounts.a += 1;
              yield* provide();
            }),
          },
          b: {
            dependsOn: { startup: [] as const, restart: ["a"] as const },
            operation: resource<void>(function* (provide) {
              startCounts.b += 1;
              yield* provide();
            }),
          },
        },
        { watch: true, watchDebounce: 20 }
      );

      try {
        yield* op();
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // wait for initial startup
    for (let i = 0; i < 200; i++) {
      if (startCounts.a > 0 && startCounts.b > 0) break;
      yield* sleep(10);
    }

    // trigger a change
    yield* until(fs.writeFile(trigger, "changed"));

    // wait for restarts to occur
    for (let i = 0; i < 200; i++) {
      if (startCounts.a >= 2 && startCounts.b >= 2) break;
      yield* sleep(10);
    }
  });

  await fs.rm(dir, { recursive: true, force: true });

  assert(startCounts.a >= 2, "a should have been restarted");
  assert(startCounts.b >= 2, "b should have been restarted as dependent");
});

it("restarts transitive dependents when watched service changes", async () => {
  const prefix = path.join(os.tmpdir(), "sim-watch-rt-2-");
  const dir = await fs.mkdtemp(prefix);
  const trigger = path.join(dir, "trigger.txt");
  await fs.writeFile(trigger, "initial");

  const startCounts: Record<string, number> = { a: 0, b: 0, c: 0 };

  await run(function* () {
    yield* spawn(function* () {
      const op = useServiceGraph(
        {
          a: {
            watch: [dir],
            operation: resource<void>(function* (provide) {
              startCounts.a += 1;
              yield* provide();
            }),
          },
          b: {
            dependsOn: { startup: [] as const, restart: ["a"] as const },
            operation: resource<void>(function* (provide) {
              startCounts.b += 1;
              yield* provide();
            }),
          },
          c: {
            dependsOn: { startup: [] as const, restart: ["b"] as const },
            operation: resource<void>(function* (provide) {
              startCounts.c += 1;
              yield* provide();
            }),
          },
        },
        { watch: true, watchDebounce: 20 }
      );

      try {
        yield* op();
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // wait for initial startup
    for (let i = 0; i < 200; i++) {
      if (startCounts.a > 0 && startCounts.b > 0 && startCounts.c > 0) break;
      yield* sleep(10);
    }

    // trigger a change
    yield* until(fs.writeFile(trigger, "changed"));

    // wait for restarts to occur
    for (let i = 0; i < 200; i++) {
      if (startCounts.a >= 2 && startCounts.b >= 2 && startCounts.c >= 2) break;
      yield* sleep(10);
    }
  });

  await fs.rm(dir, { recursive: true, force: true });

  assert(startCounts.a >= 2, "a should have been restarted");
  assert(startCounts.b >= 2, "b should have been restarted as dependent");
  assert(startCounts.c >= 2, "c should have been restarted as dependent of b");
});
