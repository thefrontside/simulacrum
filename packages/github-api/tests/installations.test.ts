import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation } from "../src/index";

let basePort = 3302;
let host = "http://localhost";
let url = `${host}:${basePort}`;

describe.sequential("GET repo endpoints", () => {
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

  describe("/orgs/{org}/installation", () => {
    it("validates with 200 response", async () => {
      let request = await fetch(`${url}/orgs/lovely-org/installation`);
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({ login: "lovely-org" }),
        })
      );
    });

    it("handles non-existant org", async () => {
      let request = await fetch(`${url}/orgs/doesnt-exist/installation`);
      expect(request.status).toEqual(404);
    });
  });

  describe("/repos/{owner}/{repo}/installation", () => {
    it("validates with 200 response", async () => {
      let request = await fetch(
        `${url}/repos/lovely-org/awesome-repo/installation`
      );
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response).toEqual(
        expect.objectContaining({
          account: expect.objectContaining({ login: "lovely-org" }),
        })
      );
    });

    it("handles non-existant org", async () => {
      let request = await fetch(
        `${url}/repos/an-org/awesome-repo/installation`
      );
      expect(request.status).toEqual(404);
    });

    it("handles non-existant repo", async () => {
      let request = await fetch(
        `${url}/repos/lovely-org/not-awesome-repo/installation`
      );
      expect(request.status).toEqual(404);
    });

    it("handles non-existant org and repo", async () => {
      let request = await fetch(
        `${url}/repos/lovely-but-not/awesome/installation`
      );
      expect(request.status).toEqual(404);
    });
  });
});
