import { main, sleep, suspend } from "effection";

main(function* () {
  console.log(`starting test service`);
  yield* sleep(10);
  console.log(`test service started`);

  try {
    yield* suspend();
  } finally {
    console.log(`bye.`);
  }
});
