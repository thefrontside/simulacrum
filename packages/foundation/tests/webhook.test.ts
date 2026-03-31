import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation as simOne } from "../example/pingback/server-one.ts";
import { simulation as simTwo } from "../example/pingback/server-two.ts";
import type { FoundationSimulatorListening } from "../src/index.ts";

const appPortOne = 3050;
const appPortTwo = 3051;
const host = "http://localhost";
const urlOne = `${host}:${appPortOne}`;
const urlTwo = `${host}:${appPortTwo}`;

const f = (url: string) => fetch(url).then((r) => r.json());
const p = (url: string) => fetch(url, { method: "POST" }).then((r) => r.json());

console.log = (..._args: any) => {
  // comment out in test to reduce noise
};

describe("pingback", () => {
  let serverOne: FoundationSimulatorListening<any>;
  let serverTwo: FoundationSimulatorListening<any>;
  beforeAll(async () => {
    let appOne = simOne();
    serverOne = await appOne.listen(appPortOne);
    let appTwo = simTwo();
    serverTwo = await appTwo.listen(appPortTwo);
  });
  afterAll(async () => {
    await serverOne.ensureClose();
    await serverTwo.ensureClose();
  });

  it("sim servers talk back and forth", async () => {
    // check initial state
    let r1 = await f(`${urlOne}/get/boop`);
    expect(r1).toEqual({ count: 0 });
    let r2 = await f(`${urlTwo}/get/boop`);
    expect(r2).toEqual({ count: 0 });

    // trigger direct bump on each
    let r3 = await p(`${urlOne}/event/boop`);
    expect(r3).toEqual({ status: "ok" });
    let r4 = await p(`${urlTwo}/event/boop`);
    expect(r4).toEqual({ status: "ok" });

    // check they both incremented
    let r5 = await f(`${urlOne}/get/boop`);
    expect(r5).toEqual({ count: 1 });
    let r6 = await f(`${urlTwo}/get/boop`);
    expect(r6).toEqual({ count: 1 });

    // check the webhook listener is gets double incremented
    let r7 = await f(`${urlOne}/get/bap`);
    // note that we have two watchers
    // and each webhook event triggers both watchers
    expect(r7).toEqual({ count: 2 });

    // trigger via external endpoint on one
    // which will webhook to the other
    let r8 = await f(`${urlOne}/external/boop`);
    expect(r8).toEqual({ status: "ok" });

    // check the webhook pinged the other server
    let r9 = await f(`${urlOne}/get/boop`);
    expect(r9).toEqual({ count: 1 }); // unchanged
    let r10 = await f(`${urlTwo}/get/boop`);
    expect(r10).toEqual({ count: 2 });

    // our watcher has updated the bapped count though
    let r11 = await f(`${urlOne}/get/bap`);
    expect(r11).toEqual({ count: 4 }); // ie see r9 vs r11
  });
});
