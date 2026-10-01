import { fork, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createQueue,
  ensure,
  resource,
  sleep,
  spawn,
  withResolvers,
  type Operation,
} from "effection";

export const DEFAULT_REAPER_KILL_DELAY = 1000;

export type ProcessReaperClient = {
  add(pid: number): void;
  remove(pid: number): void;
};

type ReaperMessage =
  | { type: "ready" }
  | { type: "watch"; pid: number }
  | { type: "unwatch"; pid: number }
  | { type: "shutdown" };

type ReaperWorker = {
  child: ChildProcess;
  ready: boolean;
};

const reaperPathTs = fileURLToPath(new URL("./run-reaper.ts", import.meta.url));
const reaperPathJs = fileURLToPath(new URL("./run-reaper.mjs", import.meta.url));
const reaperPath = existsSync(reaperPathTs) ? reaperPathTs : reaperPathJs;

function send(child: ChildProcess, message: ReaperMessage): void {
  if (!child.connected) return;
  try {
    child.send(message);
  } catch {
    // The exit handler will reconnect and replay the complete watch set.
  }
}

/**
 * Start the detached process which owns the graph's PID watch list.
 *
 * The reaper remains alive when this process is hard-killed. A normal resource
 * teardown sends an explicit shutdown message, which prevents it from
 * interpreting the resulting IPC disconnect as a crash.
 */
export function useProcessReaper(
  killDelay = DEFAULT_REAPER_KILL_DELAY,
): Operation<ProcessReaperClient> {
  return resource(function* (provide) {
    const watched = new Set<number>();
    let worker: ReaperWorker | undefined;
    let stopping = false;
    const scheduleRestart = () => {
      if (!stopping) restartQueue.add(undefined);
    };
    const restartQueue = createQueue<void, void>();

    function* startWorker(): Operation<void> {
      let child: ChildProcess;
      try {
        child = fork(reaperPath, [String(killDelay)], {
          cwd: process.cwd(),
          detached: true,
          execArgv: process.execArgv.filter(
            (arg) => arg !== "--test" && !arg.startsWith("--test-"),
          ),
          stdio: ["ignore", "ignore", "ignore", "ipc"],
        });
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }

      const current: ReaperWorker = { child, ready: false };
      worker = current;
      child.unref();
      const ready = withResolvers<void>("wait for process reaper to become ready");

      child.on("message", (message: ReaperMessage) => {
        if (message.type !== "ready" || worker !== current) return;
        current.ready = true;
        for (const pid of watched) send(child, { type: "watch", pid });
        ready.resolve();
      });

      child.once("error", (error) => {
        if (worker !== current) return;
        worker = undefined;
        ready.reject(error);
        if (!stopping) scheduleRestart();
        if (child.connected) child.disconnect();
        if (child.exitCode === null && child.signalCode === null) child.kill();
      });

      child.once("exit", () => {
        if (worker !== current) return;
        worker = undefined;
        if (!current.ready) {
          ready.reject(new Error("process reaper exited before becoming ready"));
        }
        if (!stopping) scheduleRestart();
      });
      try {
        yield* ready.operation;
      } catch (error) {
        if (worker === current) worker = undefined;
        if (child.connected) child.disconnect();
        if (child.exitCode === null && child.signalCode === null) child.kill();
        throw error;
      }
    }

    function* ensureWorkerReady(): Operation<void> {
      while (!stopping && !worker?.ready) {
        try {
          yield* startWorker();
        } catch {
          yield* sleep(25);
        }
      }
    }

    yield* ensure(function* () {
      stopping = true;
      const current = worker;
      worker = undefined;
      if (!current?.child.connected) return;
      if (current.child.exitCode !== null || current.child.signalCode !== null) return;

      const exited = withResolvers<void>("wait for process reaper to stop");
      current.child.once("exit", () => exited.resolve());
      try {
        current.child.send({ type: "shutdown" }, () => {
          if (current.child.connected) current.child.disconnect();
        });
      } catch {
        current.child.disconnect();
      }
      yield* exited.operation;
    });

    yield* ensureWorkerReady();

    yield* spawn(function* () {
      while (true) {
        const next = yield* restartQueue.next();
        if (next.done) return;
        yield* sleep(25);
        if (!stopping && !worker) yield* ensureWorkerReady();
      }
    });

    const client: ProcessReaperClient = {
      add(pid) {
        if (!Number.isInteger(pid) || pid <= 0) return;
        watched.add(pid);
        if (worker?.ready) send(worker.child, { type: "watch", pid });
      },
      remove(pid) {
        watched.delete(pid);
        if (worker?.ready) send(worker.child, { type: "unwatch", pid });
      },
    };

    yield* provide(client);
  });
}
