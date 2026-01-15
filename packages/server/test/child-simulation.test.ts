import { describe, it } from "node:test";
import assert from "node:assert";
import { run, sleep, until } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { useChildSimulation } from "../src/simulation.ts";
import { waitFor } from "./utils.ts";

describe("useChildSimulation", () => {
  it("starts a child and returns port", async () => {
    await run(function* () {
      const listening = yield* useChildSimulation(
        "child-test",
        "./test/fixtures/simple-sim.ts"
      );
      assert(typeof listening.port === "number");

      // Verify we received a port and the child reported ready.
      assert(typeof listening.port === "number", "port should be a number");

      // allow a moment before teardown
      yield* sleep(20);
    });
  });

  it("handles non-JSON stdout before ready JSON from child", async () => {
    await run(function* () {
      const listening = yield* useChildSimulation(
        "non-json",
        "./test/fixtures/non-json-child.ts"
      );
      assert(typeof listening.port === "number");
    });
  });

  it("ignores JSON logs without ready/port until real ready JSON is emitted", async () => {
    await run(function* () {
      const listening = yield* useChildSimulation(
        "json-before-ready",
        "./test/fixtures/json-before-ready.ts"
      );
      assert(typeof listening.port === "number");
    });
  });

  describe("globalData forwarding", () => {
    it("forwards nested objects as globalData to child simulations", async () => {
      await run(function* () {
        const data = { a: { b: { c: 3 } }, flag: true };

        const op = useServiceGraph(
          {
            child: {
              operation: useChildSimulation(
                "child",
                "./test/fixtures/init-data-sim.ts"
              ),
            },
          },
          { globalData: data }
        );

        const runGraph = yield* op();
        yield* waitFor(
          () => typeof runGraph.servicePorts?.get("child") === "number",
          2000
        );
        const childPort = runGraph.servicePorts!.get("child")!;

        const res = yield* until(fetch(`http://127.0.0.1:${childPort}/init`));
        const json = (yield* until(res.json())) as { initData: typeof data };
        assert.deepStrictEqual(json.initData, data);
      });
    });

    it("forwards arrays as globalData to child simulations", async () => {
      await run(function* () {
        const data = { list: [1, 2, 3], nested: [{ x: 1 }, { x: 2 }] };

        const op = useServiceGraph(
          {
            child: {
              operation: useChildSimulation(
                "child",
                "./test/fixtures/init-data-sim.ts"
              ),
            },
          },
          { globalData: data }
        );

        const runGraph = yield* op();
        yield* waitFor(
          () => typeof runGraph.servicePorts?.get("child") === "number",
          2000
        );
        const childPort = runGraph.servicePorts!.get("child")!;

        const res = yield* until(fetch(`http://127.0.0.1:${childPort}/init`));
        const json = (yield* until(res.json())) as { initData: typeof data };
        assert.deepStrictEqual(json.initData, data);
      });
    });

    it("forwards deeply nested values and special types to child simulations", async () => {
      await run(function* () {
        const data = {
          users: [
            {
              id: 1,
              name: "alice",
              prefs: { theme: "dark", tags: ["a", "b"] },
            },
            { id: 2, name: "bob", prefs: { theme: "light", tags: [] } },
          ],
          meta: {
            created: "2026-01-01",
            count: 2,
            active: true,
            nothing: null,
          },
        };

        const op = useServiceGraph(
          {
            child: {
              operation: useChildSimulation(
                "child",
                "./test/fixtures/init-data-sim.ts"
              ),
            },
          },
          { globalData: data }
        );

        const runGraph = yield* op();
        yield* waitFor(
          () => typeof runGraph.servicePorts?.get("child") === "number",
          3000
        );
        const childPort = runGraph.servicePorts!.get("child")!;

        const res = yield* until(fetch(`http://127.0.0.1:${childPort}/init`));
        const json = (yield* until(res.json())) as { initData: typeof data };
        assert.deepStrictEqual(json.initData, data);
      });
    });
  });

  it("child simulation receives globalData via simulacrum gateway and registers its port", async () => {
    await run(function* () {
      const op = useServiceGraph(
        {
          child: {
            operation: useChildSimulation(
              "child",
              "./test/fixtures/init-data-sim.ts"
            ),
          },
        },
        { globalData: { hello: "world" } }
      );

      const runGraph = yield* op();

      // wait deterministically for the child port to be registered
      yield* waitFor(
        () => typeof runGraph.servicePorts?.get("child") === "number",
        3000
      );
      const childPort = runGraph.servicePorts!.get("child")!;

      const res = yield* until(fetch(`http://127.0.0.1:${childPort}/init`));
      const json = (yield* until(res.json())) as {
        initData: { hello: string };
      };
      assert.deepStrictEqual(json.initData, { hello: "world" });
    });
  });

  it("rejects when child exits before emitting listening info", async () => {
    await assert.rejects(async () => {
      await run(function* () {
        yield* useChildSimulation("broken", "./test/fixtures/broken-child.ts");
      });
    }, /child process exited before emitting listening info/);
  });
});
