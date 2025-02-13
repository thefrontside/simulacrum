import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation } from "../src/index";

let basePort = 3301;
let host = "http://localhost";
let url = `${host}:${basePort}`;

describe.sequential("GET repo endpoints", () => {
  let server;
  beforeAll(async () => {
    let app = simulation({
      initialState: {
        users: [],
        organizations: [{ login: "lovely-org" }, { login: "empty-org" }],
        repositories: [{ owner: "lovely-org", name: "awesome-repo" }],
        branches: [{ name: "main" }],
        blobs: [],
      },
    });
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  describe("/orgs/{org}/repos", () => {
    it("validates with 200 response", async () => {
      let request = await fetch(`${url}/orgs/lovely-org/repos`);
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response).toEqual([
        expect.objectContaining({ name: "awesome-repo" }),
      ]);
    });

    it("handles org with no repos", async () => {
      let request = await fetch(`${url}/orgs/empty-org/repos`);
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response).toEqual([]);
    });

    it("handles non-existant org", async () => {
      let request = await fetch(`${url}/orgs/nope-org/repos`);
      expect(request.status).toEqual(404);
    });
  });

  describe("/repos/{org}/{repo}/branches", () => {
    it("validates with 200 response", async () => {
      let request = await fetch(
        `${url}/repos/lovely-org/awesome-repo/branches`
      );
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response).toEqual([expect.objectContaining({ name: "main" })]);
    });
  });
});
