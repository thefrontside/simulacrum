import { it } from "node:test";
import assert from "node:assert";
import { run, createScope, suspend, until, sleep } from "effection";
import { useSimulation } from "../src/simulation.ts";
import { simulation } from "./fixtures/simple-sim.ts";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";

it("useSimulation returns listening info", async () => {
  const port = await run(function* () {
    const listening = yield* useSimulation("test", () => simulation(3000));
    return listening.port;
  });
  assert(typeof port === "number", "port is a number");
});

it("simulation closes when scope is destroyed", async () => {
  await run(function* () {
    const [scope, destroy] = createScope();

    let port: number | undefined;

    // start the simulation in the scope and keep it alive until destroy()
    scope.run(function* () {
      const listening = yield* useSimulation(
        "inline-test",
        createFoundationSimulationServer({
          port: 0,
          extendRouter(router) {
            router.get("/info", (_req, res) => res.json({ ok: true }));
          },
        })
      );
      port = listening.port;
      yield* suspend();
    });

    // wait for the scope-run to set the port
    for (let i = 0; i < 100; i++) {
      if (typeof port === "number") break;
      yield* sleep(5);
    }

    const status = yield* until(
      fetch(new URL(`http://127.0.0.1:${port}/info`))
    );
    if (!status.ok) {
      throw new Error(`expected 200 OK from simulation, got ${status.status}`);
    }

    // now destroy the scope and ensure the server stops accepting connections
    yield* until(destroy());

    // server should no longer accept connections
    let closed = false;
    for (let i = 0; i < 50; i++) {
      try {
        yield* until(fetch(new URL(`http://127.0.0.1:${port}/info`)));
        // if request succeeded, wait and retry
      } catch (e) {
        closed = true;
        break;
      }
      yield* sleep(10);
    }

    if (!closed) throw new Error("simulation still responds after destroy");
  });
});
