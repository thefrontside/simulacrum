import { it } from "node:test";
import assert from "node:assert";
import { run, sleep, until } from "effection";
import { useServiceGraph } from "../src/services.ts";

it("starts data service and serves configured data", async () => {
  await run(function* () {
    const runGraph = yield* useServiceGraph(
      {},
      { globalData: { a: 1, nested: { b: 2 } } }
    )();

    let port: string | number | undefined = undefined;
    for (let i = 0; i < 50 && !port; i++) {
      if (runGraph && runGraph.servicePorts) {
        port = runGraph.servicePorts.get("simulacrum");
        if (typeof port === "number") break;
      }
      yield* sleep(10);
    }

    assert.ok(
      typeof port === "number",
      "data service port should be registered on servicePorts"
    );

    const res = yield* until(fetch(`http://127.0.0.1:${port}/data`));
    const json = yield* until(res.json());
    assert.deepStrictEqual(json, { a: 1, nested: { b: 2 } });
  });
});
