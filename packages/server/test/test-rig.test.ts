import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import { run, until } from "effection";
import { useServiceGraph } from "../src/service-graph.ts";
import { useSimulation } from "../src/simulation.ts";
import { createServiceTestRig, useServiceTestRig } from "../src/test-rig.ts";
import { type StartedTask } from "../src/taskable.ts";
import { waitForFetchClosed } from "./utils.ts";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

describe("test rigs", () => {
  let starts = 0;
  const graphRunner = useServiceGraph({
    a: {
      operation: useSimulation("a", () => {
        starts += 1;
        return createFoundationSimulationServer({
          port: 0,
          extendRouter(router) {
            router.get("/info", (_req, res) => res.json({ ok: true, starts }));
          },
        })();
      }),
    },
  });

  describe("promise flavor", () => {
    const createRig = createServiceTestRig(graphRunner, {
      createWith({ graph }) {
        const port = graph.status.get("a")?.port;
        assert.ok(
          port && port > 0,
          "service port should be available while building rig interactions",
        );
        return {
          a: {
            async info() {
              const response = await fetch(`http://127.0.0.1:${port}/info`);
              return response.json();
            },
          },
        };
      },
    });
    let rig: ReturnType<typeof createRig>;
    let service: StartedTask<typeof rig>;

    beforeEach(async () => {
      starts = 0;
      rig = createRig();
      service = await rig.start();
    });

    afterEach(async () => {
      await rig.halt();
    });

    it("can expose a promise-flavored rig handle", async () => {
      assert.strictEqual(typeof rig.then, "function");
      assert.strictEqual(typeof rig.start, "function");
      assert.strictEqual(typeof rig.halt, "function");
      assert.ok(rig.running, "task should expose the backing Effection task");

      assert.notStrictEqual(service.graph.status, undefined);
      const port = service.graph.status.get("a")?.port;
      assert.ok(port && port > 0, "service port should be available after beforeEach startup");
      assert.strictEqual(typeof service.with.a.info, "function");
    });

    it("can build a helper from service startup metadata", async () => {
      const info = await service.with.a.info();
      assert.deepStrictEqual(info, { ok: true, starts: 1 });
    });

    it("can expose an awaitable task that starts once, stays running, and halts cleanly", async () => {
      assert.notStrictEqual(service.graph.status, undefined);
      const simPort = service.graph.status.get("simulacrum")?.port;
      assert.ok(simPort && simPort > 10000);
      assert.strictEqual(typeof rig.halt, "function");
      assert.strictEqual(starts, 1, "task should only start the simulator once before halt");

      const port = service.graph.status.get("a")?.port;
      assert.ok(port && port > 0, "service port should be available after awaiting the task");

      const response = await fetch(`http://127.0.0.1:${port}/info`);
      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(await response.json(), { ok: true, starts: 1 });
    });
  });

  describe("operation flavor", () => {
    const useRig = useServiceTestRig(graphRunner, {
      createWith({ graph }) {
        const port = graph.status.get("a")?.port;
        assert.ok(
          port && port > 0,
          "service port should be available while building rig interactions",
        );
        return {
          a: {
            *info() {
              const response = yield* until(fetch(`http://127.0.0.1:${port}/info`));
              return yield* until(response.json());
            },
          },
        };
      },
    });

    it("can expose an operation-flavored rig handle", async () =>
      run(function* () {
        const operationRig = yield* useRig();

        assert.notStrictEqual(operationRig.graph.status, undefined);
        const port = operationRig.graph.status?.get("a")?.port;
        assert.ok(port && port > 0, "service port should be available after yielding the rig");
        assert.strictEqual(typeof operationRig.with.a?.info, "function");
      }));

    it("can build a helper from service startup metadata", async () =>
      run(function* () {
        starts = 0;
        const operationRig = yield* useRig();

        const info = yield* operationRig.with.a.info();
        assert.deepStrictEqual(info, { ok: true, starts: 1 });
      }));

    it("can stay running for the scope and halt cleanly when the scope exits", async () => {
      starts = 0;
      let port: number | undefined;
      await run(function* () {
        const operationRig = yield* useRig();

        assert.notStrictEqual(operationRig.graph.status, undefined);
        const simPort = operationRig.graph.status?.get("simulacrum")?.port;
        assert.ok(simPort && simPort > 10000);
        assert.strictEqual(
          starts,
          1,
          "operation rig should only start the simulator once per scope",
        );

        port = operationRig.graph.status?.get("a")?.port;
        assert.ok(
          port && port > 0,
          "service port should be available while the operation scope is active",
        );

        assert.deepStrictEqual(yield* operationRig.with.a.info(), { ok: true, starts: 1 });

        const response = yield* until(fetch(`http://127.0.0.1:${port}/info`));
        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(yield* until(response.json()), { ok: true, starts: 1 });
      });

      assert.ok(port && port > 0, "service port should have been captured before scope shutdown");
      await run(function* () {
        yield* waitForFetchClosed(`http://127.0.0.1:${port}/info`, 2000);
      });
    });
  });
});
