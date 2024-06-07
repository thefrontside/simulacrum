import { bench, describe } from "vitest";
import { simulation as singleFileSimulation } from "../example/singleFileServer";
import { simulation as extensiveSimulation } from "../example/extensiveServer";

describe("server start and close", () => {
  bench("single file server", async () => {
    let app = await singleFileSimulation;
    let server = await app.listen();
    await server.ensureClose();
  });

  bench("extensive server", async () => {
    let app = await extensiveSimulation;
    let server = await app.listen();
    await server.ensureClose();
  });
});
