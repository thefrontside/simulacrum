import { main } from "effection";
import { httpServer } from "../../example/services/http-server.ts";

main(() => httpServer({ startDelay: 40 }));
