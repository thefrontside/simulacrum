import { it } from "node:test";
import assert from "node:assert";
import { run } from "effection";
import { createReplaySignal } from "../src/createReplaySignal.ts";

it("replays queued items to new subscribers and supports close", async () => {
  await run(function* () {
    const sig = createReplaySignal<string, string>();

    // send some items before subscribing
    sig.send("a");
    sig.send("b");

    // subscribe
    const sub = yield* sig;

    // expect queued items in order
    const first = yield* sub.next();
    assert.strictEqual(first.done, false);
    assert.strictEqual(first.value, "a");

    const second = yield* sub.next();
    assert.strictEqual(second.done, false);
    assert.strictEqual(second.value, "b");

    // send a new item and see it
    sig.send("c");
    const third = yield* sub.next();
    assert.strictEqual(third.done, false);
    assert.strictEqual(third.value, "c");

    // close the signal with a value
    sig.close("fin");
    const closed = yield* sub.next();
    assert.strictEqual(closed.done, true);
    assert.strictEqual(closed.value, "fin");
  });
});
