import { describe, it } from "node:test";
import assert from "node:assert";
import { run, until } from "effection";
import { waitFor, waitForOperation } from "./utils.ts";

import { services as basicServices } from "../example/simulation-graph.ts";
import { services as concurrencyServices } from "../example/concurrency-layers.ts";
import { services as processServices } from "../example/process-graph.ts";

describe("example as service rig", { concurrency: 1 }, () => {
  it("basic example imports and runs", async () => {
    await run(function* () {
      let provided = yield* basicServices();

      // wait until all declared services have registered a port
      yield* waitFor(() => {
        return ["A", "B"].every((name) => typeof provided?.status?.get(name)?.port === "number");
      }, 5000);

      if (!provided.status) {
        throw new Error(`expected service status to be available after services started`);
      }

      const ps: number[] = [];
      for (const name of Object.keys(provided.services)) {
        const port = provided.status.get(name)?.port;
        if (typeof port === "number") ps.push(port);
      }

      assert(ps.length > 0, "expected at least one service port to be registered");
      assert.ok(ps[0], "service A should have a port registered");
      assert.ok(ps[1], "service B should have a port registered");

      // check each tapped port for healthy status while graph is running
      for (const p of ps) {
        yield* waitForOperation(function* () {
          const status = yield* until(fetch("http://localhost:" + p + "/status"));
          return status.ok;
        }, 2000);
      }
    });
  });

  it("concurrency example imports and runs", async () => {
    await run(function* () {
      let provided = yield* concurrencyServices();

      // wait until child simulation services have registered a port
      yield* waitFor(() => {
        return ["fast", "slow"].every(
          (name) => typeof provided?.status?.get(name)?.port === "number",
        );
      }, 5000);

      if (!provided.status) {
        throw new Error(`expected service status to be available after services started`);
      }

      const ps: number[] = [];
      for (const name of Object.keys(provided.services)) {
        const port = provided.status.get(name)?.port;
        if (typeof port === "number") ps.push(port);
      }

      assert(ps.length > 0, "expected at least one service port to be registered");
      assert.ok(ps[0], "service fast should have a port registered");
      assert.ok(ps[1], "service slow should have a port registered");

      // check each tapped port for healthy status while graph is running
      for (const p of ps) {
        yield* waitForOperation(function* () {
          const status = yield* until(fetch("http://localhost:" + p + "/status"));
          return status.ok;
        }, 2000);
      }
    });
  });

  it("process example imports and runs", async () => {
    await run(function* () {
      let provided = yield* processServices();

      yield* waitFor(() => {
        return ["A", "B"].every((name) => provided?.status?.has(name));
      }, 5000);

      for (const port of [3301, 3302]) {
        yield* waitForOperation(function* () {
          const status = yield* until(fetch(`http://localhost:${port}/status`));
          return status.ok;
        }, 5000);
      }
    });
  });
});
