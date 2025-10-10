import { startFoundationSimulationServer } from "../../src/index.ts";

await startFoundationSimulationServer({
  port: 9090,
  serveJsonFiles: `${import.meta.dirname}/jsonFiles`,
});
