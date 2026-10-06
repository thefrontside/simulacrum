import { it } from "node:test";
import assert from "node:assert";
import { createServer } from "node:net";
import { resource, run, until } from "effection";
import { exec } from "@effectionx/process";
import { useServiceGraph } from "../src/service-graph.ts";
import { useSimulation } from "../src/simulation.ts";
import { useService } from "../src/service.ts";
import { waitFor, waitForOperation } from "./utils.ts";

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
          operation: useSimulation("api", "./test/fixtures/init-data-sim.ts"),
        },
        notSelected: {
          operation: useSimulation("not-selected", "./test/fixtures/init-data-sim.ts"),
        },
      },
      {
        globalData: { featureFlag: true },
        controlPort,
      },
    )(["api"]);

    yield* waitFor(() => typeof runGraph.status?.get("api")?.port === "number", 3000);

    const healthRes = yield* until(fetch(`http://127.0.0.1:${controlPort}/health`));
    assert.strictEqual(healthRes.status, 200);
    assert.deepStrictEqual(yield* until(healthRes.json()), { ok: true, port: controlPort });

    const statusRes = yield* until(fetch(`http://127.0.0.1:${controlPort}/status`));
    assert.strictEqual(statusRes.status, 200);
    const statusJson = (yield* until(statusRes.json())) as {
      services: Record<
        string,
        {
          state: string;
          port?: number;
          pid?: number;
          command?: { executable: string; arguments: string[] };
          lastExit?: { requestedSignal?: string; code?: number; signal?: string };
        }
      >;
    };

    assert.strictEqual(statusJson.services.simulacrum?.port, controlPort);
    assert.strictEqual(statusJson.services.simulacrum?.state, "ready");
    assert.strictEqual(statusJson.services.simulacrum?.pid, process.pid);
    assert.strictEqual(statusJson.services.simulacrum?.command?.executable, process.execPath);
    assert.strictEqual(statusJson.services.api?.port, runGraph.status.get("api")?.port);
    assert.strictEqual(statusJson.services.api?.state, "ready");
    assert.strictEqual(statusJson.services.api?.command?.executable, "node");
    assert.ok(statusJson.services.api?.command?.arguments[0]?.includes("run-simulation-child"));
    assert.strictEqual("notSelected" in statusJson.services, false);

    const dataRes = yield* until(fetch(`http://127.0.0.1:${controlPort}/data/featureFlag`));
    assert.strictEqual(dataRes.status, 200);
    assert.deepStrictEqual(yield* until(dataRes.json()), true);

    const apiPid = statusJson.services.api?.pid;
    assert.strictEqual(typeof apiPid, "number");
    process.kill(apiPid!, "SIGTERM");
    yield* waitForOperation(function* () {
      const response = yield* until(fetch(`http://127.0.0.1:${controlPort}/status`));
      const status = (yield* until(response.json())) as typeof statusJson;
      const lastExit = status.services.api?.lastExit;
      return (
        status.services.api?.state === "failed" &&
        status.services.api?.pid === undefined &&
        status.services.api?.port === undefined &&
        (typeof lastExit?.code === "number" || typeof lastExit?.signal === "string")
      );
    });
  });
});

it("tracks useService processes under their graph service name", async () => {
  const controlPort = await getAvailablePort();

  await run(function* () {
    yield* useServiceGraph(
      {
        worker: {
          operation: useService("display-name", "node ./test/services/service-main.ts"),
        },
      },
      { controlPort },
    )();

    const response = yield* until(fetch(`http://127.0.0.1:${controlPort}/status`));
    const status = (yield* until(response.json())) as {
      services: Record<
        string,
        { state: string; pid?: number; command?: { executable: string; arguments: string[] } }
      >;
    };
    assert.strictEqual(typeof status.services.worker?.pid, "number");
    assert.strictEqual(status.services.worker?.state, "ready");
    assert.deepStrictEqual(status.services.worker?.command, {
      executable: "node ./test/services/service-main.ts",
      arguments: [],
      shell: true,
    });
    assert.strictEqual("display-name" in status.services, false);
  });
});

it("observes a process exit while its service scope remains alive", async () => {
  const controlPort = await getAvailablePort();
  let operationAlive = false;
  let exitChild: (() => void) | undefined;

  await run(function* () {
    yield* useServiceGraph(
      {
        worker: {
          operation: resource<void>(function* (provide) {
            const child = yield* exec(process.execPath, {
              arguments: [
                "-e",
                "process.stdin.once('data', () => process.exit(0)); setInterval(() => {}, 1000)",
              ],
            });
            exitChild = () => child.stdin.send("exit");
            operationAlive = true;
            try {
              yield* provide();
            } finally {
              operationAlive = false;
            }
          }),
        },
      },
      { controlPort },
    )();

    assert.strictEqual(operationAlive, true);
    assert.ok(exitChild);
    exitChild();

    yield* waitForOperation(function* () {
      const response = yield* until(fetch(`http://127.0.0.1:${controlPort}/status`));
      const status = (yield* until(response.json())) as {
        services: Record<string, { state?: string; pid?: number }>;
      };
      return status.services.worker?.state === "failed" && status.services.worker.pid === undefined;
    });

    assert.strictEqual(operationAlive, true);
  });

  assert.strictEqual(operationAlive, false);
});
