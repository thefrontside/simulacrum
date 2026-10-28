import { setTimeout as delay } from "node:timers";
import { spawnSync } from "node:child_process";
import { ctrlc } from "ctrlc-windows";

type ReaperMessage =
  | { type: "watch"; pid: number }
  | { type: "unwatch"; pid: number }
  | { type: "shutdown" };

const killDelay = Number(process.argv[2]) || 10_000;
const watched = new Set<number>();
let released = false;
let reapTimer: NodeJS.Timeout | undefined;

function signalAll(signal: NodeJS.Signals): void {
  for (const pid of watched) {
    try {
      // as we don't use @effectionx/process because it doesn't support detaching
      // and leaving a process running, we had to use child_process directly to start
      // and manage their termination manually.
      if (process.platform === "win32") {
        if (signal === "SIGKILL") {
          spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
            stdio: "ignore",
            windowsHide: true,
          });
        } else {
          ctrlc(pid);
        }
      } else {
        // @effectionx/process starts POSIX processes in their own process group.
        process.kill(-pid, signal);
      }
    } catch (error) {
      if (process.platform !== "win32" && (error as NodeJS.ErrnoException).code === "ESRCH") {
        watched.delete(pid);
      }
      // The process may have exited between registration and reaping.
    }
  }
}

function anyWatchedProcessGroupAlive(): boolean {
  if (process.platform === "win32") return watched.size > 0;

  for (const pid of watched) {
    try {
      process.kill(-pid, 0);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") {
        watched.delete(pid);
      } else {
        return true;
      }
    }
  }
  return false;
}

function reap(): void {
  if (released || reapTimer) return;
  signalAll("SIGTERM");
  const deadline = Date.now() + killDelay;
  const check = () => {
    if (watched.size === 0) {
      process.exit(0);
    } else if (Date.now() >= deadline) {
      // Do not probe PGID liveness here; a completed group ID could be reused.
      signalAll("SIGKILL");
      process.exit(0);
    } else if (!anyWatchedProcessGroupAlive()) {
      process.exit(0);
    } else {
      reapTimer = delay(check, Math.min(100, deadline - Date.now()));
    }
  };
  check();
}

process.on("message", (message: ReaperMessage) => {
  if (message.type === "watch") {
    if (!released) watched.add(message.pid);
  } else if (message.type === "unwatch") {
    watched.delete(message.pid);
  } else if (message.type === "shutdown") {
    released = true;
    watched.clear();
    if (process.connected) process.disconnect();
  }
});

process.on("disconnect", reap);

if (!process.send) {
  process.exit(1);
} else {
  process.send({ type: "ready" });
}
