import { once } from "node:events";
import { fork, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { it } from "node:test";
import { DEFAULT_REAPER_KILL_DELAY } from "../src/reaper.ts";

const reaperPath = fileURLToPath(new URL("../src/run-reaper.ts", import.meta.url));

it("allows ten seconds for graceful shutdown by default", () => {
  assert.strictEqual(DEFAULT_REAPER_KILL_DELAY, 10_000);
});

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
  return spawn(process.execPath, ["-e", script], { detached: true, stdio: "ignore" });
}

async function waitForPidExit(pid: number) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for process ${pid} to exit`);
}

it("reaps watched processes after its IPC connection closes", async () => {
  const victim = startVictim();
  const reaper = fork(reaperPath, ["50"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  try {
    await waitForReady(reaper);
    reaper.send({ type: "watch", pid: victim.pid });
    reaper.disconnect();

    const [code, signal] = await waitForExit(victim);
    assert.ok(code !== null || signal !== null);
    await once(reaper, "exit");
  } finally {
    if (reaper.connected) reaper.kill();
    if (!victim.killed) victim.kill("SIGKILL");
  }
});

it("does not reap processes after an explicit shutdown", async () => {
  const victim = startVictim();
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

    const [code, signal] = await victimExit;
    if (process.platform === "win32") {
      assert.ok(code !== null || signal !== null);
    } else {
      assert.strictEqual(signal, "SIGKILL");
    }
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
    assert.ok(results.every(([code, signal]) => code !== null || signal !== null));
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

it("kills descendants in the watched process group", async () => {
  const script = [
    'const { spawn } = require("node:child_process");',
    'const child = spawn(process.execPath, ["-e", "process.on(\'SIGTERM\', () => {}); setInterval(() => {}, 10000)"], { stdio: "ignore" });',
    'process.on("SIGTERM", () => {});',
    "process.stdout.write(`${child.pid}\\n`);",
    "setInterval(() => {}, 10000);",
  ].join("\n");
  const victim = spawn(process.execPath, ["-e", script], {
    detached: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
  let grandchildPid: number | undefined;
  const reaper = fork(reaperPath, ["50"], {
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });

  try {
    const [chunk] = await once(victim.stdout!, "data");
    grandchildPid = Number(chunk.toString().trim());
    assert.ok(Number.isInteger(grandchildPid) && grandchildPid > 0);

    await waitForReady(reaper);
    const victimExit = waitForExit(victim);
    reaper.send({ type: "watch", pid: victim.pid });
    reaper.disconnect();

    await victimExit;
    await waitForPidExit(grandchildPid);
    await once(reaper, "exit");
  } finally {
    if (reaper.connected) reaper.kill();
    if (!victim.killed) victim.kill("SIGKILL");
    if (grandchildPid !== undefined) {
      try {
        process.kill(grandchildPid, "SIGKILL");
      } catch {
        // The reaper may already have terminated the descendant.
      }
    }
  }
});
