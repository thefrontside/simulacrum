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

function startVictim(ignoreTerm = false) {
  const script = ignoreTerm
    ? "process.on('SIGTERM', () => {}); setInterval(() => {}, 10000)"
    : "setInterval(() => {}, 10000)";
  return spawn(process.execPath, ["-e", script], { stdio: "ignore" });
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

it("escalates to SIGKILL when a watched process ignores SIGTERM", async () => {
  const victim = startVictim(true);
  const reaper = fork(reaperPath, ["50"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  try {
    await waitForReady(reaper);
    const victimExit = waitForExit(victim);
    reaper.send({ type: "watch", pid: victim.pid });
    reaper.disconnect();

    const [, signal] = await victimExit;
    assert.strictEqual(signal, "SIGKILL");
    await once(reaper, "exit");
  } finally {
    // cleanup only used to ensure no processes are left running
    // if something is broken
    if (reaper.connected) reaper.kill();
    if (!victim.killed) victim.kill("SIGKILL");
  }
});

it("reaps all watched processes but leaves unwatched processes running", async () => {
  const watched = [startVictim(), startVictim(), startVictim()];
  const unwatched = startVictim(true);
  const reaper = fork(reaperPath, ["50"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  try {
    await waitForReady(reaper);
    const watchedExits = watched.map(waitForExit);
    const unwatchedExit = waitForExit(unwatched);
    for (const victim of watched) {
      reaper.send({ type: "watch", pid: victim.pid });
    }
    reaper.send({ type: "watch", pid: unwatched.pid });
    reaper.send({ type: "unwatch", pid: unwatched.pid });
    reaper.disconnect();

    const results = await Promise.all(watchedExits);
    assert.ok(results.every(([, signal]) => signal === "SIGTERM" || signal === "SIGKILL"));
    await once(reaper, "exit");
    assert.strictEqual(unwatched.exitCode, null);
    assert.strictEqual(unwatched.signalCode, null);
    unwatched.kill("SIGKILL");
    await unwatchedExit;
  } finally {
    // cleanup only used to ensure no processes are left running
    // if something is broken
    if (reaper.connected) reaper.kill();
    for (const victim of [...watched, unwatched]) {
      if (!victim.killed) victim.kill("SIGKILL");
    }
  }
});
