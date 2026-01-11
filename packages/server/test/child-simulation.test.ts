import { it } from "node:test";
import assert from "node:assert";
import { run, sleep } from "effection";
import { useChildSimulation } from "../src/simulation.ts";

it("useChildSimulation starts a child and returns port", async () => {
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
