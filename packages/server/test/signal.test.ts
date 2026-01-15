import { it } from "node:test";
import assert from "node:assert";
import { spawn as spawnChild } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, sleep, until, spawn, on, each } from "effection";
import { timebox } from "@effectionx/timebox";
import { emitterToEventTarget } from "./utils.ts";

it("example process shuts down cleanly on SIGINT", async () => {
  await run(function* () {
    const exe = process.execPath;
    const script = fileURLToPath(
      new URL("../example/simulation-graph.ts", import.meta.url)
    );
    const cwd = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      ".."
    );

    const child = spawnChild(exe, ["--import", "tsx", script], {
      cwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    // use Effection `on()` + `each()` by adapting Node emitter to EventTarget
    const outTarget = emitterToEventTarget(child.stdout!);
    const errTarget = emitterToEventTarget(child.stderr!);

    // spawn background tasks to accumulate stdout and stderr
    yield* spawn(function* () {
      for (let chunk of yield* each(on(outTarget, "data"))) {
        stdout += String(chunk);
        yield* each.next();
      }
    });

    yield* spawn(function* () {
      for (let chunk of yield* each(on(errTarget, "data"))) {
        stderr += String(chunk);
        yield* each.next();
      }
    });

    try {
      // wait for a startup marker using the stdout Stream with a timebox
      const started = yield* timebox(3000, function* () {
        for (let chunk of yield* each(on(outTarget, "data"))) {
          const s = String(chunk);
          if (
            s.includes("runner: starting layers") ||
            s.includes("service graph: starting service")
          ) {
            return { started: true };
          }
          yield* each.next();
        }
        return undefined;
      });

      if (started && started.timeout)
        throw new Error("startup marker not seen");

      // send SIGINT
      process.kill(child.pid!, "SIGINT");

      // wait for the child to exit (timeboxed)
      const exitRes = yield* timebox(3000, function* () {
        const p = new Promise<{
          code: number | null;
          signal: NodeJS.Signals | null;
        }>((resolve) => {
          child.on("exit", (code, signal) => resolve({ code, signal }));
        });
        return yield* until(p);
      });

      if (exitRes && exitRes.timeout)
        throw new Error("child did not exit in time");

      // timebox may return an object with `.value` or the value directly — handle both
      let code: number | null = null;
      let signal: NodeJS.Signals | null = null;
      const maybe = exitRes as any;
      const val = maybe && "value" in maybe ? maybe.value : maybe;
      if (val && typeof val === "object") {
        code = val.code;
        signal = val.signal;
      }

      // allow stderr to flush a little
      yield* sleep(50);

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
    } finally {
      // ensure process is killed
      try {
        child.kill("SIGKILL");
      } catch (_) {}
    }
  });
});
