import { main } from "effection";
import { httpServer } from "../../example/services/http-server.ts";

main(function* () {
  yield* httpServer({ startDelay: 200 });
});
