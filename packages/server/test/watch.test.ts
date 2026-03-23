import { it } from "node:test";
import assert from "node:assert";
import {
  run,
  suspend,
  sleep,
  until,
  spawn,
  resource,
  ensure,
  withResolvers,
} from "effection";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { useServiceGraph } from "../src/services.ts";
import { simulation } from "./fixtures/simple-sim.ts";
import { useSimulation } from "../src/simulation.ts";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";
import { waitFor, waitForOperation } from "./utils.ts";

it("restarts services on watched file change and restarts dependents", async () => {
  const prefix = path.join(os.tmpdir(), "sim-watch-");
  // create a temporary directory to hold test files
  const dir = await fs.mkdtemp(prefix);
  const trigger = path.join(dir, "trigger.txt");

  // initial trigger file
  await fs.writeFile(trigger, "initial");

  const updates: string[] = [];
  const subscriptionReady = withResolvers<void>();

  await run(function* () {
    yield* spawn(function* () {
      // start the graph and enable watch mode
      const op = useServiceGraph(
        {
          a: {
            watch: [dir],
            operation: useSimulation("test-simulation-a", () =>
              simulation(5500),
            ),
          },
          b: {
            dependsOn: { startup: ["a"] as const },
            operation: useSimulation("test-simulation-a", () =>
              simulation(5501),
            ),
          },
        },
        { watch: true, watchDebounce: 20 },
      );

      try {
        const services = yield* op();
        // subscribe to the immediate raw serviceChanges stream and wait for the first update
        if (!services.serviceChanges)
          throw new Error("serviceChanges not available");
        const subscription = yield* services.serviceChanges;
        subscriptionReady.resolve();

        // wait for the first raw update (will occur after the test touches the file)
        const first = yield* subscription.next();
        updates.push(String((first.value as { service: string }).service));
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // ensure initial trigger is readable
    yield* waitForOperation(function* () {
      try {
        yield* until(fs.readFile(trigger, "utf8"));
        return true;
      } catch (_) {
        return false;
      }
    }, 2000);

    // wait for the subscription to be ready before touching the file
    yield* subscriptionReady.operation;

    // touch the trigger file to cause a restart
    yield* until(fs.writeFile(trigger, "changed"));

    // wait for the raw watcher update to be observed
    yield* waitFor(() => updates.length >= 1, 2000);
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
        { watch: true, watchDebounce: 20 },
      );

      try {
        yield* op();
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // wait for initial startup
    yield* waitFor(() => startCounts.a > 0 && startCounts.b > 0, 2000);

    // trigger a change
    yield* until(fs.writeFile(trigger, "changed"));

    // wait for restarts to occur
    yield* waitFor(() => startCounts.a >= 2 && startCounts.b >= 2, 3000);
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
        { watch: true, watchDebounce: 20 },
      );

      try {
        yield* op();
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // wait for initial startup
    yield* waitFor(
      () => startCounts.a > 0 && startCounts.b > 0 && startCounts.c > 0,
      2000,
    );

    // trigger a change
    yield* until(fs.writeFile(trigger, "changed"));

    // wait for restarts to occur
    yield* waitFor(
      () => startCounts.a >= 2 && startCounts.b >= 2 && startCounts.c >= 2,
      3000,
    );
  });

  await fs.rm(dir, { recursive: true, force: true });

  assert(startCounts.a >= 2, "a should have been restarted");
  assert(startCounts.b >= 2, "b should have been restarted as dependent");
  assert(startCounts.c >= 2, "c should have been restarted as dependent of b");
});

it("updates servicePorts when a service restarts", async () => {
  const prefix = path.join(os.tmpdir(), "sim-port-rt-");
  const dir = await fs.mkdtemp(prefix);
  const trigger = path.join(dir, "trigger.txt");
  await fs.writeFile(trigger, "initial");

  await run(function* () {
    const op = useServiceGraph(
      {
        s: {
          watch: [dir],
          operation: useSimulation(
            "s",
            createFoundationSimulationServer({ port: 0 }),
          ),
        },
      },
      {
        watch: true,
        watchDebounce: 20,
      },
    );

    const services = yield* op();

    // wait for initial port to appear
    yield* waitFor(
      () => typeof services.status?.get("s")?.port === "number",
      2000,
    );
    const initial = services.status!.get("s")!.port!;

    // trigger restart by touching the file
    yield* until(fs.writeFile(trigger, "changed"));

    // wait for new port value to be different from initial
    yield* waitFor(() => {
      const p = services.status?.get("s")?.port;
      return typeof p === "number" && p !== initial;
    }, 3000);
    const updated = services.status!.get("s")!.port!;

    assert.ok(typeof initial === "number", "initial port should be present");
    assert.ok(typeof updated === "number", "updated port should be present");
    assert.notStrictEqual(initial, updated, "port should change after restart");
  });

  await fs.rm(dir, { recursive: true, force: true });
});

it("debounces rapid changes per service", async () => {
  const prefix = path.join(os.tmpdir(), "sim-watch-debounce-");
  const dir = await fs.mkdtemp(prefix);
  const trigger = path.join(dir, "trigger.txt");
  await fs.writeFile(trigger, "initial");

  const updates: string[] = [];
  let rawCount = 0;
  const watcherReady = withResolvers<void>();

  await run(function* () {
    yield* spawn(function* () {
      const op = useServiceGraph(
        {
          a: {
            watch: [dir],
            operation: resource<void>(function* (provide) {
              yield* provide();
            }),
          },
        },
        { watch: true, watchDebounce: 150 },
      );

      try {
        const services = yield* op();
        if (!services.serviceUpdates || !services.serviceChanges)
          throw new Error("service streams not available");
        const debSub = yield* services.serviceUpdates;
        const rawSub = yield* services.serviceChanges;

        watcherReady.resolve();

        // collect debounced updates
        yield* spawn(function* () {
          while (true) {
            const n = yield* debSub.next();
            if (n.done) break;
            updates.push((n.value as { service: string }).service);
          }
        });

        // count raw updates (should reflect every write)
        yield* spawn(function* () {
          while (true) {
            const n = yield* rawSub.next();
            if (n.done) break;
            if ((n.value as { service: string }).service === "a") rawCount++;
          }
        });
      } catch (e) {
        throw e;
      }

      yield* suspend();
    });

    // ensure watcher subscribed before triggering writes
    yield* watcherReady.operation;

    // write multiple times rapidly
    yield* until(fs.writeFile(trigger, "changed-1"));
    yield* sleep(10);
    yield* until(fs.writeFile(trigger, "changed-2"));
    yield* sleep(10);
    yield* until(fs.writeFile(trigger, "changed-3"));

    yield* ensure(() => until(fs.rm(dir, { recursive: true, force: true })));
    // wait until some raw/etc updates are observed
    yield* waitFor(() => rawCount > 0 && updates.length > 0, 2000);
  });

  // we expect the rapid writes to coalesce: there should be at least one
  // raw and at least one debounced update, and debounced updates should be
  // fewer than the number of writes (3)
  assert(rawCount >= 1, `expected at least 1 raw update, got ${rawCount}`);
  assert(updates.length >= 1, "expected at least one debounced update");
  const aCount = updates.filter((u) => u === "a").length;
  assert(
    aCount < 3,
    `expected debounced updates to be fewer than writes (3), got ${aCount}`,
  );
});
