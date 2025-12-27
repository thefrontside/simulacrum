import { it } from "node:test";
import http from "node:http";
import { run, spawn, sleep } from "effection";

import { services as basicServices } from "../example/operation/basic-graph.ts";
import { services as lifecycleServices } from "../example/operation/lifecycle-hooks.ts";
import { services as concurrencyServices } from "../example/operation/concurrency-layers.ts";

function checkStatus(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: "/status" },
      (res) => {
        resolve(res.statusCode ?? 0);
      }
    );
    req.on("error", reject);
  });
}

import { useServiceGraph } from "../src/services.ts";

it("basic example imports and runs", async () => {
  const services = basicServices;

  // start the graph and await exported ports in a single run operation
  const ports: number[] = await run(function* () {
    yield* spawn(function* () {
      yield* useServiceGraph(services as any);
    });

    const ps: number[] = [];
    for (const name of Object.keys(services)) {
      const exportsOp = (services as any)[name].exportsOperation;
      if (!exportsOp) throw new Error(`no exportsOperation on ${name}`);
      ps.push(yield* exportsOp);
    }

    // keep the graph alive briefly to allow HTTP checks
    yield* sleep(200);
    return ps as number[];
  });

  // check each port
  for (const p of ports) {
    let ok = false;
    for (let i = 0; i < 100; i++) {
      try {
        const status = await checkStatus(p);
        if (status === 200) {
          ok = true;
          break;
        }
      } catch (err) {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    if (!ok) throw new Error(`port ${p} did not return 200`);
  }
});

it("lifecycle example imports and runs", async () => {
  const services = lifecycleServices;

  const ports: number[] = await run(function* () {
    yield* spawn(function* () {
      yield* useServiceGraph(services as any);
    });

    const ps: number[] = [];
    for (const name of Object.keys(services)) {
      const exportsOp = (services as any)[name].exportsOperation;
      if (!exportsOp) throw new Error(`no exportsOperation on ${name}`);
      ps.push(yield* exportsOp);
    }

    yield* sleep(200);
    return ps as number[];
  });

  for (const p of ports) {
    const status = await checkStatus(p);
    if (status !== 200) throw new Error(`port ${p} did not return 200`);
  }
});

it("concurrency example imports and runs", async () => {
  const services = concurrencyServices;

  const ports: number[] = await run(function* () {
    yield* spawn(function* () {
      yield* useServiceGraph(services as any);
    });

    const ps: number[] = [];
    for (const name of Object.keys(services)) {
      const exportsOp = (services as any)[name].exportsOperation;
      if (!exportsOp) throw new Error(`no exportsOperation on ${name}`);
      ps.push(yield* exportsOp);
    }

    yield* sleep(200);
    return ps as number[];
  });

  for (const p of ports) {
    const status = await checkStatus(p);
    if (status !== 200) throw new Error(`port ${p} did not return 200`);
  }
});
