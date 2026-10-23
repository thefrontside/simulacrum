import assert from "node:assert/strict";
import { it } from "node:test";
import { ServiceStatusRecord } from "../src/service-status.ts";

it("clears live process details while retaining the last exit", () => {
  const status = new ServiceStatusRecord();
  status.update({
    state: "failed",
    pid: 42,
    port: 8080,
    command: { executable: "node", arguments: ["server.js"] },
    lastExit: { code: 143 },
  });

  status.clear();

  assert.deepStrictEqual(status.snapshot(), {
    state: "failed",
    lastExit: { code: 143 },
  });
});

it("clears the in-flight requested signal when a replacement starts", () => {
  const status = new ServiceStatusRecord({ state: "stopping" });
  status.update({
    requestedSignal: "SIGTERM",
    lastExit: { requestedSignal: "SIGTERM", signal: "SIGTERM" },
  });

  status.update({ state: "starting" });

  assert.deepStrictEqual(status.snapshot(), {
    state: "starting",
    lastExit: { requestedSignal: "SIGTERM", signal: "SIGTERM" },
  });
});

it("preserves a valid command when an update has no usable command", () => {
  const status = new ServiceStatusRecord();
  const command = { executable: "node", arguments: ["server.js"] };
  status.update({ pid: 42, command });

  status.update({ command: undefined });
  status.update({ command: { executable: 42, arguments: "server.js" } });

  assert.deepStrictEqual(status.snapshot().command, command);
});
