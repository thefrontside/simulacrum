import { run, spawn, sleep } from "effection";

run(function* () {
  yield* spawn(function* () {
    console.log("debug - spawn start");
    yield* sleep(100);
    console.log("debug - spawn done");
  });
  console.log("debug - after spawn (should only print after spawn completes)");
});
