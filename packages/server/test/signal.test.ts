import { it } from "node:test";
import assert from "node:assert";
import { spawn as spawnChild } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

it("example process shuts down cleanly on SIGINT", async () => {
  const exe = process.execPath;
  const script = fileURLToPath(
    new URL("../example/basic-graph.ts", import.meta.url)
  );
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

  const child = spawnChild(exe, ["--import", "tsx", script], {
    cwd,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (d) => (stdout += String(d)));
  child.stderr?.on("data", (d) => (stderr += String(d)));

  // wait for a startup marker
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("start timeout")), 3000);
    child.stdout?.on("data", function ondata(d) {
      const s = String(d);
      if (s.includes("runner: starting layers")) {
        clearTimeout(to);
        child.stdout?.off("data", ondata);
        resolve();
      }
    });
  });

  // send SIGINT
  process.kill(child.pid!, "SIGINT");

  const { code, signal } = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.on("exit", (code, signal) => resolve({ code, signal }));
  });

  // allow stderr to flush
  await new Promise((r) => setTimeout(r, 50));

  // expect no stack traces on stderr and process exited due to SIGINT
  assert.strictEqual(typeof stderr, "string");
  assert(
    !/uncaughtException|UnhandledPromiseRejection|Error/.test(stderr),
    `stderr contained error: ${stderr}`
  );
  // Accept either signal SIGINT or code 0 or code 130 (standard SIGINT exit code)
  assert(
    signal === "SIGINT" || code === 0 || code === 130,
    `unexpected exit: code=${code} signal=${signal}`
  );
});
