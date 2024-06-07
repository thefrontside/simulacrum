import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation } from "../example/extensiveServer";

/*
 * In this test file, we start the server once for the whole suite.
 * The server state ends up being shared between the tests.
 * With `sequential`, we note the shared state increments with each test.
 */

let basePort = 9048;
let host = "http://localhost";
let url = `${host}:${basePort}`;

describe.sequential("single file server - startup in every test", () => {
  let server;
  beforeAll(async () => {
    let app = await simulation;
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  it("returns", async () => {
    let request = await fetch(`${url}/api/pets`);
    let response = await request.json();
    expect(response).toEqual([
      { id: 1, name: "Garfield" },
      { id: 2, name: "Odie" },
    ]);
  });

  it("returns again", async () => {
    let request = await fetch(`${url}/api/pets`);
    let response = await request.json();
    expect(response).toEqual([
      { id: 1, name: "Garfield" },
      { id: 2, name: "Odie" },
    ]);
  });

  it("adds one dog", async () => {
    // note calling this endpoint increments the number of dogs expected
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 1 });
  });

  it("adds five more dogs", async () => {
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 6 });
  });

  it("adds three more dogs", async () => {
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 9 });
  });

  it("adds six more dogs", async () => {
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 15 });
  });
});
