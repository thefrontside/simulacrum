import { setTimeout as delay } from "node:timers";

type ReaperMessage =
  | { type: "watch"; pid: number }
  | { type: "unwatch"; pid: number }
  | { type: "shutdown" };

const killDelay = Number(process.argv[2]) || 1000;
const watched = new Set<number>();
let released = false;
let reapTimer: NodeJS.Timeout | undefined;

function signalAll(signal: NodeJS.Signals): void {
  for (const pid of watched) {
    try {
      process.kill(pid, signal);
    } catch {
      // The process may have exited between registration and reaping.
    }
  }
}

function reap(): void {
  if (released || reapTimer) return;
  signalAll("SIGTERM");
  reapTimer = delay(() => {
    signalAll("SIGKILL");
    process.exit(0);
  }, killDelay);
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
