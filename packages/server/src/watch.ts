import { join } from "node:path";
import chokidar, { type EmitArgs } from "chokidar";
import {
  createChannel,
  createSignal,
  each,
  type Operation,
  resource,
  spawn,
  type Stream,
  until,
} from "effection";
import { useAttributes } from "./logging.ts";
import picomatch, { type Matcher } from "picomatch";
import { filter } from "@effectionx/stream-helpers";

export type ServiceUpdate = { service: string; path: string };

/**
 * Start a file watcher for services and provide streams of updates.
 *
 * This helper wraps `chokidar` and computes optional transitive dependents
 * (based on `dependsOn.restart`) so that updates can be propagated to
 * dependent services. The returned object exposes:
 *
 * - `serviceUpdates`: immediate updates for a service (`{service, path}`)
 * - `serviceChanges`: debounced updates suitable for restart propagation
 * - `add(service, paths)`: add watch paths for a service
 *
 * @param services - optional service map used to compute transitive dependents
 * @param options - optional `{ watchDebounce?: number }` to configure debounce
 */
export function useWatcher(
  services?: Record<
    string,
    { dependsOn?: { restart?: readonly string[] }; watchDebounce?: number }
  >,
  options?: { watchDebounce?: number },
): Operation<{
  serviceUpdates: Stream<{ service: string; path: string }, void>;
  serviceChanges: Stream<{ service: string; path: string }, void>;
  add: (service: string, paths: string[]) => void;
}> {
  return resource(function* (provide) {
    yield* useAttributes({
      name: "watcher",
      serviceCount: String(services ? Object.keys(services).length : 0),
      debounce: String(options?.watchDebounce ?? ""),
    });
    const changes = createSignal<EmitArgs, never>();
    const serviceUpdates = createChannel<ServiceUpdate>();
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

    // precompute transitive dependents map if services are provided. This allows
    // the watcher to emit updates not only for the changed service but also for
    // any services that declare it in dependsOn.restart, transitively.
    const dependentsMap = new Map<string, string[]>();
    if (services) {
      const restartAdj: Record<string, string[]> = {};
      for (const name of Object.keys(services)) restartAdj[name] = [];
      for (const name of Object.keys(services)) {
        const def = services[name];
        for (const dep of def.dependsOn?.restart ?? []) {
          if (!(dep in restartAdj)) continue;
          restartAdj[dep].push(name);
        }
      }

      for (const n of Object.keys(services)) {
        const seen = new Set<string>();
        const stack = [...(restartAdj[n] ?? [])];
        while (stack.length) {
          const cur = stack.pop()!;
          if (seen.has(cur)) continue;
          seen.add(cur);
          for (const next of restartAdj[cur] ?? []) {
            if (!seen.has(next)) stack.push(next);
          }
        }
        dependentsMap.set(n, Array.from(seen));
      }
    }

    yield* spawn(function* () {
      yield* useAttributes({ name: "handleChange" });
      for (let args of yield* each(changes)) {
        const [path] = args as EmitArgs;
        for (let [service, matchers] of serviceList.entries()) {
          const isAffected = matchers.some((matcher) => {
            return matcher(path);
          });
          if (isAffected) {
            // send update for the service itself
            yield* serviceUpdates.send({ service, path });
            // then also send updates for its transitive dependents (if any)
            const dependents = dependentsMap.get(service) ?? [];
            for (const d of dependents) {
              yield* serviceUpdates.send({ service: d, path });
            }
          }
        }
        yield* each.next();
      }
    });

    const debounceMs = options?.watchDebounce !== undefined ? options.watchDebounce : 250;
    const serviceTimers = {} as Record<string, number>;
    const debouncedServiceChanges = filter<ServiceUpdate>(function* (updateStream) {
      yield* useAttributes({
        name: "debounceCheck",
        service: updateStream.service,
      });
      const now = performance.now();
      if (
        serviceTimers[updateStream.service] &&
        now - serviceTimers[updateStream.service] < debounceMs
      ) {
        return false;
      } else {
        serviceTimers[updateStream.service] = now;
        return true;
      }
    });

    try {
      yield* provide({
        serviceUpdates,
        add,
        serviceChanges: debouncedServiceChanges(serviceUpdates),
      });
    } finally {
      yield* until(watcher.close());
    }
  });
}
