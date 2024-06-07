import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { simulation } from "../example/singleFileServer";

/*
 * In this test file, we expect each test to start up and shut down the server.
 * As such, we use `sequential` ensure these tests run separately, one after another.
 */

let basePort = 9009;
let host = "http://localhost";
let url = `${host}:${basePort}`;

describe.sequential("single file server - startup in every test", () => {
  let server;
  beforeEach(async () => {
    let app = await simulation;
    server = await app.listen(basePort);
  });
  afterEach(async () => {
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

  it("adds five dogs", async () => {
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 5 });
  });

  it("adds three dogs", async () => {
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 3 });
  });

  it("adds six dogs", async () => {
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);
    await fetch(`${url}/api/more-dogs`);

    let request = await fetch(`${url}/api/dogs`);
    let response = await request.json();
    expect(response).toEqual({ dogs: 6 });
  });
});
