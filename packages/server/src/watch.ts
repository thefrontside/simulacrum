import { join } from "node:path";
import chokidar, { type EmitArgs } from "chokidar";
import {
  createChannel,
  createSignal,
  each,
  race,
  resource,
  sleep,
  spawn,
  type Stream,
  until,
} from "effection";
import picomatch, { type Matcher } from "picomatch";

export function debounce<T, R>(
  ms: number
): (stream: Stream<T, R>) => Stream<T, R> {
  return (stream) => ({
    *[Symbol.iterator]() {
      let subscription = yield* stream;
      return {
        *next() {
          let next = yield* subscription.next();
          while (true) {
            let result = yield* race([sleep(ms), subscription.next()]);
            if (!result) {
              return next;
            } else {
              next = result;
            }
          }
        },
      };
    },
  });
}

export function useWatcher() {
  return resource(function* (provide) {
    const changes = createSignal<EmitArgs, never>();
    const serviceUpdates = createChannel<{ service: string; path: string }>();
    const serviceList = new Map<string, Matcher[]>();

    const watcher = chokidar.watch([], {
      ignoreInitial: true,
    });

    watcher.on("change", (...args) => {
      changes.send(args);
    });

    function add(service: string, paths: string[]) {
      // Convert directory paths into recursive globs so that picomatch will
      // match any files under those directories. Include the original path
      // as well so exact matches still work.
      const globs = paths.flatMap((p) => [p, join(p, "**")]);
      const matchers = globs.map((g) => picomatch(g));
      serviceList.set(service, matchers);
      watcher.add(paths);
    }

    yield* spawn(function* () {
      for (let args of yield* each(changes)) {
        const [path] = args as EmitArgs;
        for (let [service, matchers] of serviceList.entries()) {
          const isAffected = matchers.some((matcher) => {
            return matcher(path);
          });
          if (isAffected) {
            yield* serviceUpdates.send({ service, path });
          }
        }
        yield* each.next();
      }
    });

    try {
      yield* provide({ serviceUpdates, add });
    } finally {
      yield* until(watcher.close());
    }
  });
}
