import { once } from "node:events";
import { fork, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { it } from "node:test";

const reaperPath = fileURLToPath(new URL("../src/run-reaper.ts", import.meta.url));

async function waitForReady(child: ReturnType<typeof fork>) {
  await new Promise<void>((resolve, reject) => {
    const onMessage = (message: { type?: string }) => {
      if (message.type === "ready") {
        child.off("error", onError);
        resolve();
      }
    };
    const onError = (error: Error) => {
      child.off("message", onMessage);
      reject(error);
    };
    child.on("message", onMessage);
    child.once("error", onError);
  });
}

function waitForExit(child: ReturnType<typeof spawn>) {
  return once(child, "exit") as Promise<[number | null, NodeJS.Signals | null]>;
}

it("reaps watched processes after its IPC connection closes", async () => {
  const victim = spawn(process.execPath, ["-e", "setInterval(() => {}, 10000)"], {
    stdio: "ignore",
  });
  const reaper = fork(reaperPath, ["50"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  try {
    await waitForReady(reaper);
    reaper.send({ type: "watch", pid: victim.pid });
    reaper.disconnect();

    const [, signal] = await waitForExit(victim);
    assert.ok(signal === "SIGTERM" || signal === "SIGKILL");
    await once(reaper, "exit");
  } finally {
    if (reaper.connected) reaper.kill();
    if (!victim.killed) victim.kill("SIGKILL");
  }
});

it("does not reap processes after an explicit shutdown", async () => {
  const victim = spawn(process.execPath, ["-e", "setInterval(() => {}, 10000)"], {
    stdio: "ignore",
  });
  const reaper = fork(reaperPath, ["50"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  try {
    await waitForReady(reaper);
    reaper.send({ type: "watch", pid: victim.pid });
    reaper.send({ type: "shutdown" });
    await once(reaper, "exit");
    assert.strictEqual(victim.exitCode, null);
  } finally {
    if (reaper.connected) reaper.kill();
    if (!victim.killed) victim.kill("SIGKILL");
  }
});
