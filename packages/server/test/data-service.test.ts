import { it } from "node:test";
import assert from "node:assert";
import { run, until } from "effection";
import { useServiceGraph } from "../src/services.ts";
import { waitFor } from "./utils.ts";

it("starts data service and serves configured data", async () => {
  await run(function* () {
    const runGraph = yield* useServiceGraph(
      {},
      { globalData: { a: 1, nested: { b: 2 } } }
    )();

    // wait deterministically for the simulacrum port to be registered
    yield* waitFor(
      () => Boolean(runGraph?.servicePorts?.get("simulacrum")),
      2000
    );
    const port = runGraph!.servicePorts!.get("simulacrum")!;

    assert.ok(
      typeof port === "number",
      "data service port should be registered on servicePorts"
    );

    const res = yield* until(fetch(`http://127.0.0.1:${port}/data`));
    const json = yield* until(res.json());
    assert.deepStrictEqual(json, { a: 1, nested: { b: 2 } });
  });
});

it("serves individual keys and appropriate status codes", async () => {
  await run(function* () {
    const runGraph = yield* useServiceGraph(
      {},
      { globalData: { a: 1, nested: { b: 2 } } }
    )();

    // wait deterministically for the simulacrum port
    yield* waitFor(
      () => Boolean(runGraph?.servicePorts?.get("simulacrum")),
      2000
    );
    const port = runGraph!.servicePorts!.get("simulacrum")!;

    assert.ok(typeof port === "number");

    // existing key
    const aRes = yield* until(fetch(`http://127.0.0.1:${port}/data/a`));
    assert.strictEqual(aRes.status, 200);
    const aJson = yield* until(aRes.json());
    assert.deepStrictEqual(aJson, 1);

    // nested key returns object
    const nestedRes = yield* until(
      fetch(`http://127.0.0.1:${port}/data/nested`)
    );
    assert.strictEqual(nestedRes.status, 200);
    const nestedJson = yield* until(nestedRes.json());
    assert.deepStrictEqual(nestedJson, { b: 2 });

    // missing key -> 404
    const missRes = yield* until(
      fetch(`http://127.0.0.1:${port}/data/does-not-exist`)
    );
    assert.strictEqual(missRes.status, 404);

    // empty key -> 400
    const emptyRes = yield* until(fetch(`http://127.0.0.1:${port}/data/`));
    assert.strictEqual(emptyRes.status, 400);
  });
});
