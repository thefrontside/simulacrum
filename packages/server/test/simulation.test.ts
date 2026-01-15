import { it } from "node:test";
import assert from "node:assert";
import { run, createScope, suspend, until } from "effection";
import { useSimulation } from "../src/simulation.ts";
import { simulation } from "./fixtures/simple-sim.ts";
import { createFoundationSimulationServer } from "@simulacrum/foundation-simulator";
import { waitFor, waitForFetchClosed } from "./utils.ts";

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
    // where we can test it actually shutdown
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
    yield* waitFor(() => typeof port === "number", 2000);

    const status = yield* until(
      fetch(new URL(`http://127.0.0.1:${port}/info`))
    );
    if (!status.ok) {
      throw new Error(`expected 200 OK from simulation, got ${status.status}`);
    }

    // now destroy the scope and ensure the server stops accepting connections
    yield* until(destroy());

    // server should no longer accept connections
    yield* waitForFetchClosed(`http://127.0.0.1:${port}/info`, 2000);
  });
});
