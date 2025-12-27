import { main } from "effection";
import { httpServer } from "./http-server.ts";

main(() => httpServer({ startDelay: 100 }));
