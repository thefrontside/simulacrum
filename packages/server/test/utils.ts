import { timebox } from "@effectionx/timebox";
import { sleep, until, type Operation } from "effection";

/**
 * Wait for `predicate` to become true with a timeboxed timeout.
 * Throws on timeout.
 */
export function* waitFor(predicate: () => boolean, timeout = 2000): Operation<void> {
  const res = yield* timebox(timeout, function* () {
    while (!predicate()) {
      yield* sleep(10);
    }
  });

  if (res && (res as any).timeout) {
    throw new Error("timed out waiting for condition");
  }
}

/**
 * Cast a Node EventEmitter (e.g., `child.stdout`) to an EventTarget-like
 * object with `addEventListener`/`removeEventListener`. This is useful for
 * using `on()` with Node APIs that emit events.
 */
export function emitterToEventTarget(emitter: NodeJS.EventEmitter) {
  return {
    addEventListener(name: string, listener: (...args: any[]) => void) {
      // Node's event listeners receive chunks or event args; keep signature loose
      emitter.on(name as any, listener as any);
    },
    removeEventListener(name: string, listener: (...args: any[]) => void) {
      emitter.off(name as any, listener as any);
    },
  } as EventTarget;
}

/**
 * Wait for an async predicate (returns Promise<boolean>) to become true.
 */
export function* waitForOperation(
  predicate: () => Operation<boolean>,
  timeout = 2000,
): Operation<void> {
  const res = yield* timebox(timeout, function* () {
    while (true) {
      try {
        const ok = yield* predicate();
        if (ok) return;
      } catch (_) {
        // ignore and retry
      }
      yield* sleep(10);
    }
  });

  if (res && res.timeout) {
    throw new Error("timed out waiting for async condition");
  }
}

/**
 * Wait until fetching the given url fails (connection refused or other error)
 * which is commonly used to detect a server shutting down.
 */
export function* waitForFetchClosed(url: string, timeout = 2000) {
  const res = yield* timebox(timeout, function* () {
    while (true) {
      try {
        const s = yield* until(fetch(url));
        if (!s.ok) return;
      } catch (_) {
        return;
      }
      yield* sleep(10);
    }
  });

  if (res && (res as any).timeout) {
    throw new Error("timed out waiting for fetch to fail");
  }
}
