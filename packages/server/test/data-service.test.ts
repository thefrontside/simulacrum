import { it } from "node:test";
import assert from "node:assert";
import { createServer } from "node:net";
import { run, until } from "effection";
import { useServiceGraph } from "../src/service-graph.ts";
import { useSimulation } from "../src/simulation.ts";
import { waitFor } from "./utils.ts";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

async function getAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address !== null && "port" in address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(port);
        }
      });
    });
  });
}

it("starts data service and serves configured data", async () => {
  await run(function* () {
    const runGraph = yield* useServiceGraph(
      {},
      {
        globalData: { a: 1, nested: { b: 2 } },
      },
    )();

    // wait deterministically for the simulacrum port to be registered
    yield* waitFor(() => typeof runGraph.status?.get("simulacrum")?.port === "number", 2000);
    const port = runGraph.status!.get("simulacrum")!.port!;

    assert.ok(typeof port === "number", "data service port should be registered on serviceStatus");

    const res = yield* until(fetch(`http://127.0.0.1:${port}/data`));
    const json = yield* until(res.json());
    assert.deepStrictEqual(json, { a: 1, nested: { b: 2 } });
  });
});

it("serves individual keys and appropriate status codes", async () => {
  await run(function* () {
    const runGraph = yield* useServiceGraph(
      {},
      {
        globalData: { a: 1, nested: { b: 2 } },
      },
    )();

    yield* waitFor(() => typeof runGraph.status?.get("simulacrum")?.port === "number", 2000);
    const port = runGraph.status!.get("simulacrum")!.port!;

    assert.ok(typeof port === "number");

    // existing key
    const aRes = yield* until(fetch(`http://127.0.0.1:${port}/data/a`));
    assert.strictEqual(aRes.status, 200);
    const aJson = yield* until(aRes.json());
    assert.deepStrictEqual(aJson, 1);

    // nested key returns object
    const nestedRes = yield* until(fetch(`http://127.0.0.1:${port}/data/nested`));
    assert.strictEqual(nestedRes.status, 200);
    const nestedJson = yield* until(nestedRes.json());
    assert.deepStrictEqual(nestedJson, { b: 2 });

    // missing key returns 404
    const missRes = yield* until(fetch(`http://127.0.0.1:${port}/data/does-not-exist`));
    assert.strictEqual(missRes.status, 404);

    // empty key returns 400
    const emptyRes = yield* until(fetch(`http://127.0.0.1:${port}/data/`));
    assert.strictEqual(emptyRes.status, 400);
  });
});

it("binds the control service to a requested static port and exposes health/status", async () => {
  const controlPort = await getAvailablePort();

  await run(function* () {
    const runGraph = yield* useServiceGraph(
      {
        api: {
          operation: useSimulation("api", () =>
            createFoundationSimulationServer({
              port: 0,
            })(),
          ),
        },
      },
      {
        globalData: { featureFlag: true },
        controlPort,
      },
    )();

    yield* waitFor(() => typeof runGraph.status?.get("api")?.port === "number", 3000);

    const healthRes = yield* until(fetch(`http://127.0.0.1:${controlPort}/health`));
    assert.strictEqual(healthRes.status, 200);
    assert.deepStrictEqual(yield* until(healthRes.json()), { ok: true, port: controlPort });

    const statusRes = yield* until(fetch(`http://127.0.0.1:${controlPort}/status`));
    assert.strictEqual(statusRes.status, 200);
    const statusJson = (yield* until(statusRes.json())) as {
      services: Record<string, { port?: number; pid?: number }>;
    };

    assert.strictEqual(statusJson.services.simulacrum?.port, controlPort);
    assert.strictEqual(statusJson.services.api?.port, runGraph.status.get("api")?.port);

    const dataRes = yield* until(fetch(`http://127.0.0.1:${controlPort}/data/featureFlag`));
    assert.strictEqual(dataRes.status, 200);
    assert.deepStrictEqual(yield* until(dataRes.json()), true);
  });
});
