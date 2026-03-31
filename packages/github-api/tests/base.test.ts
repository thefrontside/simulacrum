import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation } from "../src/index.ts";

let basePort = 2999;
let host = "http://localhost";
let url = `${host}:${basePort}`;

describe.sequential("GET user endpoints", () => {
  let server;
  beforeAll(async () => {
    let app = simulation({
      initialState: {
        users: [],
        organizations: [{ login: "lovely-org" }],
        repositories: [{ owner: "lovely-org", name: "awesome-repo" }],
        branches: [{ name: "main" }],
        blobs: [],
      },
      extend: {
        extendRouter: (router, _simulationStore) => {
          router.get("/hello-world", (_req, res) => {
            res.status(200).json({ message: "Hello from GitHub API simulator!" });
          });
        },
      },
    });
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  it("allows extending the router", async () => {
    let res: Response = await fetch(`${url}/hello-world`);
    expect(res.ok).toBe(true);
  });
});
