import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation } from "../src/index";

let basePort = 3300;
let host = "http://localhost";
let url = `${host}:${basePort}/api/v3`;

describe.sequential("extensive server - start once", () => {
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
    });
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  describe("/installation/repositories", () => {
    it("validates with 200 response", async () => {
      let request = await fetch(`${url}/installation/repositories`);
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.repositories).toEqual([
        expect.objectContaining({ name: "awesome-repo" }),
      ]);
    });
  });

  describe("/orgs/{org}/repos", () => {
    it("validates with 200 response", async () => {
      let request = await fetch(`${url}/orgs/lovel-org/repos`);
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response).toEqual([
        expect.objectContaining({ name: "awesome-repo" }),
      ]);
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
