import { main, sleep, suspend } from "effection";

main(function* () {
  console.log(`starting test service`);
  yield* sleep(10);
  console.log(`test service started`);
  yield* sleep(10);
  console.log(`test service running 1`);
  yield* sleep(10);
  console.log(`test service running 2`);

  try {
    yield* suspend();
  } finally {
    console.log(`bye.`);
  }
});
