import { main } from "effection";
import { httpServer } from "./http-server.ts";

main(function* () {
  yield* httpServer({ startDelay: 10 });
});
