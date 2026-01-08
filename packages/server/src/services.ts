import {
  type Operation,
  resource,
  spawn,
  suspend,
  withResolvers,
  createChannel,
  each,
  sleep,
  until,
  type Stream,
  type Task,
} from "effection";

// Types for watcher and channels
export type ServiceUpdate = { service: string; path: string };

type WatchesStream = Stream<string, unknown> & {
  send: (value: string) => Operation<void>;
  close: (value?: void) => Operation<void>;
};

type Watcher = {
  serviceUpdates: Stream<ServiceUpdate, unknown>;
  add: (service: string, paths: string[]) => void;
};
import * as fs from "node:fs/promises";
import type { Stats } from "node:fs";
import { useWatcher } from "./watch.ts";

export type ServiceDefinition<T = any> = {
  // The operation that starts the service and returns when the service is ready.
  // The operation may be provided either as an `Operation` (for example the
  // `Operation<T>` returned by `useService<T>(...)`) or as a factory that
  // returns an `Operation`. The operation may return a value of any type
  // which will be delivered to dependent service factories at runtime.
  // Accept either an `Operation<T>` or a factory `() => Operation<T>`.
  operation: Operation<T> | ((...args: any[]) => Operation<T>);
  // folders/files to watch for changes which should cause a restart
  watch?: string[];
  // debounce in milliseconds to coalesce rapid changes for this service
  watchDebounce?: number;
  deps?: string[];
  options?: {
    // Keep an options object for future expansion or hooks; currently unused when operation is present
  };
  // lifecycle hooks
  beforeStart?: () => Operation<void>;
  afterStart?: () => Operation<void>;
  beforeStop?: () => Operation<void>;
  afterStop?: () => Operation<void>;
};

// helper type to extract the return type from an Operation or an operation factory
type OpReturn<T> = T extends Operation<infer U>
  ? U
  : T extends () => Operation<infer U>
  ? U
  : T extends (...args: any[]) => Operation<infer U>
  ? U
  : never;

// Build a tuple of dependency return types for a given service key
type DepKeys<S, K extends keyof S> = S[K] extends { deps: readonly (infer D)[] }
  ? D
  : [];

type DepArgs<S, K extends keyof S> = DepKeys<S, K> extends readonly any[]
  ? {
      [I in keyof DepKeys<S, K>]: DepKeys<S, K>[I] extends keyof S
        ? S[DepKeys<S, K>[I]] extends { operation: infer OP }
          ? OpReturn<OP>
          : unknown
        : unknown;
    }
  : [];

// Ensure we have a tuple/array type for rest-parameter compatibility
type ArgsTuple<S, K extends keyof S> = DepArgs<S, K> extends readonly any[]
  ? DepArgs<S, K>
  : any[];

// A strongly-typed service definition for use within a concrete ServicesMap S.
export type ServiceDefinitionFor<
  S extends Record<string, any>,
  K extends keyof S,
  T = any
> = {
  // operation may be a simple Operation<T> or a factory that accepts the
  // exported values of the declared `deps` and returns Operation<T>
  operation:
    | Operation<T>
    | ((...args: ArgsTuple<S, K>) => Operation<T>)
    | ((...args: any[]) => Generator<any, T, any>);
  // folders/files to watch for changes which should cause a restart
  watch?: string[];
  // debounce in milliseconds to coalesce rapid changes for this service
  watchDebounce?: number;
  deps?: readonly (keyof S)[];
  options?: {
    // placeholder for future options
  };
  beforeStart?: () => Operation<void>;
  afterStart?: () => Operation<void>;
  beforeStop?: () => Operation<void>;
  afterStop?: () => Operation<void>;
};

// Generic Services map - callers can use this shape, and useServiceGraph will
// enforce stronger typing via its own generic parameter
export type ServicesMap = Record<string, ServiceDefinitionFor<any, any>>;

// Previously we exposed a public `exportsOperation` for each service; that has been removed.
// service keyed by the return type of its `operation`.
// Note: we no longer attach an `exportsOperation` on the public service map.
// Internal exported values are still resolved and passed to dependent service factories
// but are not exposed as a separate operation on the services object.

function computeLevels(services: ServicesMap): string[][] {
  const indeg: Record<string, number> = {};
  const graph: Record<string, Set<string>> = {};
  for (const name of Object.keys(services)) {
    indeg[name] = 0;
    graph[name] = new Set();
  }
  for (const [name, def] of Object.entries(services)) {
    for (const dep of def.deps ?? []) {
      const depKey = String(dep);
      if (!(depKey in services)) {
        throw new Error(
          `Service '${name}' depends on unknown service '${depKey}'`
        );
      }
      graph[depKey].add(String(name));
      indeg[String(name)] = (indeg[String(name)] || 0) + 1;
    }
  }

  const levels: string[][] = [];
  let q: string[] = [];
  for (const [k, v] of Object.entries(indeg)) {
    if (v === 0) q.push(k);
  }

  let processed = 0;
  while (q.length) {
    const currentLayer = q.slice();
    levels.push(currentLayer);
    processed += currentLayer.length;
    const next: string[] = [];
    for (const n of currentLayer) {
      for (const m of graph[n]) {
        indeg[m] -= 1;
        if (indeg[m] === 0) next.push(m);
      }
    }
    q = next;
  }
  if (processed !== Object.keys(services).length) {
    throw new Error(`Cycle detected in services`);
  }
  return levels;
}

function* waitForAllReady(
  names: string[],
  readyResolvers: Map<
    string,
    {
      operation: Operation<void>;
      resolve: () => void;
      reject: (err: Error) => void;
    }
  >
): Operation<void> {
  for (const n of names) {
    const r = readyResolvers.get(n);
    if (r) {
      yield* r.operation;
    }
  }
}

// A runner returned by `useServiceGraph` — callable to start the graph and
// also exposes properties used by the CLI and tests.
// The object provided by the service graph resource when started
export type ServiceGraphValue<S extends Record<string, any>> = {
  services: S;
  serviceUpdates?: Stream<ServiceUpdate, unknown> | undefined;
  watches: WatchesStream;
  // map of last known ports for services that expose a `port` in their export value
  servicePorts: Map<string, number>;
};

/**
 * useServiceGraph
 *
 * Start a set of services with dependencies (a DAG). Each service must provide an
 * Operation<void> that starts the service and returns once the service is ready.
 *
 * Example usage:
 *
 * yield* useServiceGraph({
 *   A: { operation: useService('A', 'node --import tsx ./test/services/service-a.ts') },
 *   B: { operation: useService('B', 'node --import tsx ./test/services/service-b.ts'), deps: ['A'] }
 * });
 *
 * Services within the same topological layer are started concurrently by default.
 * Pass an optional `options` object with `{ sequential: true }` to force services
 * within the same layer to start sequentially. Lifecycle hooks can be used to
 * perform actions before or after each service starts or stops.
 */
export function useServiceGraph<
  S extends Record<string, ServiceDefinitionFor<any, any>>
>(
  services: { [K in keyof S]: ServiceDefinitionFor<S, K> } & S,
  options?: { sequential?: boolean; watch?: boolean; watchDebounce?: number }
): (subset?: string[] | string) => Operation<ServiceGraphValue<S>> {
  // Create internal export resolvers for provider-returned values so dependent
  // services can obtain them during startup.
  const exportResolvers = new Map<
    string,
    {
      operation: Operation<unknown>;
      resolve: (v: unknown) => void;
      reject: (err: Error) => void;
    }
  >();
  for (const name of Object.keys(services)) {
    const r = withResolvers();
    exportResolvers.set(name, {
      operation: r.operation,
      resolve: r.resolve,
      reject: (err: Error) => r.reject(err),
    });
    // note: we intentionally do not expose a public `exportsOperation` value on the services map
    // previously we exposed an `exportsOperation` on the public service map;
    // that behavior has been removed. Internal resolvers will still be used to
    // deliver provider-exported values to dependent factories.
  }

  let runnerWatcher:
    | { serviceUpdates: Stream<ServiceUpdate, unknown> }
    | undefined;
  const providedWatches: WatchesStream = createChannel<string>();

  // create a simple channel that emits service names when they change.
  // We intentionally do not buffer updates; missing the first few updates
  // is acceptable and sometimes desirable because they will be used to
  // restart services.

  const setup = withResolvers<void>();

  return (subset?: string[] | string) =>
    resource(function* (provide) {
      const sequential = options?.sequential ?? false; // when true, start services in each layer serially

      // If a subset is provided, compute the closure including dependencies
      let effectiveServices: ServicesMap = services;
      if (subset) {
        const want = new Set<string>(
          (typeof subset === "string" ? subset.split(",") : subset).map((s) =>
            s.trim()
          )
        );
        const included = new Set<string>();
        function include(name: string) {
          if (included.has(name)) return;
          if (!(name in services))
            throw new Error(`Requested service '${name}' not found`);
          included.add(name);
          for (const dep of services[name].deps ?? []) include(String(dep));
        }
        for (const name of want) include(name);
        effectiveServices = {} as ServicesMap;
        for (const name of included) effectiveServices[name] = services[name];
      }

      const layers = computeLevels(effectiveServices);
      console.log(`runner: starting layers ${JSON.stringify(layers)}`);

      const watcher = (yield* useWatcher()) as Watcher;
      runnerWatcher = watcher;

      // channel to emit file contents for watcher consumers
      const watches: WatchesStream = providedWatches;

      // Register any configured watch paths and emit initial file contents
      for (const name of Object.keys(effectiveServices)) {
        const def = effectiveServices[name];
        if (def.watch) {
          watcher.add(name, def.watch);
          for (const p of def.watch) {
            try {
              let stat: Stats | undefined;
              try {
                stat = (yield* until(fs.stat(p))) as Stats;
              } catch (e) {
                continue;
              }
              if (!stat) continue;
              if (
                stat &&
                typeof stat.isDirectory === "function" &&
                stat.isDirectory()
              ) {
                const entries: string[] = yield* until(fs.readdir(p));

                for (const e of entries) {
                  const full = `${p}/${e}`;
                  try {
                    let content = String(
                      (yield* until(fs.readFile(full, "utf8"))) as string
                    );
                    // if the content is empty, retry a few times in case of a race
                    if (content === "") {
                      for (let i = 0; i < 5; i++) {
                        yield* sleep(10);
                        try {
                          content = String(
                            (yield* until(fs.readFile(full, "utf8"))) as string
                          );
                          if (content !== "") break;
                        } catch (e) {}
                      }
                    }

                    yield* watches.send(name);
                  } catch (e) {}
                }
              } else {
                try {
                  let content = String(
                    (yield* until(fs.readFile(p, "utf8"))) as string
                  );
                  if (content === "") {
                    for (let i = 0; i < 5; i++) {
                      yield* sleep(10);
                      try {
                        content = String(
                          (yield* until(fs.readFile(p, "utf8"))) as string
                        );
                        if (content !== "") break;
                      } catch (e) {}
                    }
                  }
                  yield* watches.send(name);
                } catch (e) {}
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // signal that we've registered watches and emitted all initial values
      // so callers can start their subscriptions with a guarantee that
      // initial state has already been produced.
      for (const n of Object.keys(effectiveServices)) {
        const d = effectiveServices[n];
        console.log(
          `setup: service ${n} has beforeStop=${
            typeof d.beforeStop === "function"
          }`
        );
      }
      setup.resolve();

      // Map to manage per-service debounce state and worker
      const state = new Map<
        string,
        {
          lastPath?: string;
          lastAt?: number;
          worker?: Operation<Task<void>> | undefined;
        }
      >();

      // track running tasks so we can halt them for restarts
      const runningTasks = new Map<string, any>();
      // track the last exported ports for services that expose a port
      const servicePorts = new Map<string, number>();

      // build reverse dependency graph to compute dependents closure
      const reverseDeps: Record<string, Set<string>> = {};
      for (const name of Object.keys(effectiveServices))
        reverseDeps[name] = new Set();
      for (const [name, def] of Object.entries(effectiveServices)) {
        for (const dep of def.deps ?? []) {
          reverseDeps[String(dep)].add(String(name));
        }
      }

      // Spawn a listener to collect service update events and debounce per-service
      yield* spawn(function* () {
        for (const ev of yield* each(watcher.serviceUpdates)) {
          const { service, path: p } = ev as ServiceUpdate;
          const def = effectiveServices[service];
          const debounceMs =
            (def && def.watchDebounce) ?? options?.watchDebounce ?? 20;
          const s = state.get(service) ?? {};
          s.lastPath = p;
          s.lastAt = Date.now();
          state.set(service, s);
          if (!s.worker) {
            // start a worker that waits for a quiet period then reads file and emits

            s.worker = spawn(function* () {
              while (true) {
                const elapsed = Date.now() - (s.lastAt ?? 0);
                const wait = Math.max(0, debounceMs - elapsed);
                if (wait > 0) yield* sleep(wait);
                if (Date.now() - (s.lastAt ?? 0) >= debounceMs) {
                  try {
                    // after debounce, send the service name (we don't need the file content)
                    yield* watches.send(service);
                  } catch (e) {
                    // ignore send errors
                  }
                  s.worker = undefined;
                  break;
                }
              }
            });
          }
          // required by `each` to allow the loop to continue correctly
          yield* each.next();
        }
      });

      // Map of readiness resolvers returned by `withResolvers` for the
      // effective services we plan to start.
      const readyResolvers = new Map<
        string,
        {
          operation: Operation<void>;
          resolve: () => void;
          reject: (err: Error) => void;
        }
      >();
      for (const name of Object.keys(effectiveServices)) {
        const r = withResolvers<void>();
        readyResolvers.set(name, {
          operation: r.operation,
          resolve: r.resolve,
          reject: r.reject,
        });
      }

      // Keep track of start order so we can run beforeStop hooks in reverse
      const startOrder: string[] = [];

      // Restart coordinator: listen for debounced watch events and restart affected services
      yield* spawn(function* () {
        const pending = new Set<string>();
        let processing = false;

        function addClosure(name: string, set: Set<string>) {
          if (set.has(name)) return;
          set.add(name);
          for (const dep of reverseDeps[name] ?? []) addClosure(dep, set);
        }

        for (const ev of yield* each(watches)) {
          const name = ev as string;
          pending.add(name);
          if (processing) {
            yield* each.next();
            continue;
          }
          processing = true;
          // small debounce to coalesce multiple rapid events
          yield* sleep(20);
          const toProcess = Array.from(pending);
          pending.clear();

          // compute closure of affected services
          const affected = new Set<string>();
          for (const n of toProcess) addClosure(n, affected);

          if (affected.size === 0) {
            processing = false;
            yield* each.next();
            continue;
          }

          // create new export & ready resolvers for affected services
          for (const n of affected) {
            const r = withResolvers<any>();
            exportResolvers.set(n, {
              operation: r.operation,
              resolve: r.resolve,
              reject: r.reject,
            });
            // previously we exposed an `exportsOperation` on the public service map;
            // that behavior has been removed. Internal resolvers will still be used to
            // deliver provider-exported values to dependent factories.

            const rr = withResolvers<void>();
            readyResolvers.set(n, {
              operation: rr.operation,
              resolve: rr.resolve,
              reject: rr.reject,
            });
          }

          console.log(
            `runner: restarting services ${Array.from(affected).join(",")}`
          );

          // stop in reverse start order so dependents stop before providers
          const stopOrder = startOrder
            .filter((s) => affected.has(s))
            .slice()
            .reverse();
          for (const n of stopOrder) {
            const task = runningTasks.get(n);
            if (task) {
              try {
                console.log(`runner: halting ${n}`);
                task.halt();
              } catch (e) {}
              runningTasks.delete(n);
            }
            // wait for port to close if known
            const port = servicePorts.get(n);
            if (typeof port === "number") {
              const net = (yield* until(
                import("node:net")
              )) as typeof import("node:net");
              const start = Date.now();
              while (Date.now() - start < 2000) {
                try {
                  yield* until(
                    new Promise<void>((resolve, reject) => {
                      const s = net.connect({ port, host: "127.0.0.1" }, () => {
                        s.end();
                        reject(new Error("still listening"));
                      });
                      s.on("error", () => {
                        s.destroy();
                        resolve();
                      });
                    })
                  );
                  break;
                } catch (e) {
                  // still listening; wait
                  yield* sleep(20);
                }
              }
            }
          }

          // remove affected from startOrder so they will be re-appended in the right order
          for (const n of affected) {
            const i = startOrder.indexOf(n);
            if (i >= 0) startOrder.splice(i, 1);
          }

          // start affected services in topological order (providers first)
          for (const layer of layers) {
            const layerAffected = layer.filter((s) => affected.has(s));
            if (layerAffected.length === 0) continue;
            for (const n of layerAffected) {
              // wait for deps
              yield* waitDeps(n);
              console.log(`runner: respawning child ${n}`);
              const task = yield* startChild(n);
              runningTasks.set(n, task);
            }
            // after spawning the layer, wait for them to be ready
            yield* waitForAllReady(layerAffected, readyResolvers);
          }

          processing = false;
          yield* each.next();
        }
      });

      // helper to spawn and run a single service name
      function startChild(name: string): Operation<Task<void>> {
        const def = effectiveServices[name];
        return spawn(function* () {
          try {
            console.log(`startChild: starting ${name}`);
            try {
              if (def.beforeStart) yield* def.beforeStart();
            } catch (err) {
              const exportRes = exportResolvers.get(name);
              if (exportRes) exportRes.reject(err as Error);
              const ready = readyResolvers.get(name);
              if (ready) ready.resolve();
              return;
            }

            // Collect dependency exported values into an object (keyed by dep name)
            const depObj: Record<string, unknown> = {};
            if (def.deps) {
              for (const dep of def.deps) {
                const depKey = String(dep);
                const exportRes = exportResolvers.get(depKey);
                if (!exportRes) {
                  throw new Error(
                    `Service '${name}' depends on unknown service '${depKey}'`
                  );
                }
                const val = yield* exportRes.operation;
                depObj[depKey] = val;
              }
            }

            // Resolve the caller-supplied operation (factory or operation).
            // If it's a factory, call it with the dependency object as a single arg.
            let operation: Operation<unknown>;
            try {
              operation =
                typeof def.operation === "function"
                  ? (
                      def.operation as (
                        args: Record<string, unknown>
                      ) => Operation<unknown>
                    )(depObj)
                  : (def.operation as Operation<unknown>);
            } catch (err) {
              const exportRes = exportResolvers.get(name);
              if (exportRes) exportRes.reject(err as Error);
              const ready = readyResolvers.get(name);
              if (ready) ready.resolve();
              return;
            }

            let exported: unknown;
            try {
              exported = yield* operation;
              const exportRes = exportResolvers.get(name);
              if (exportRes) exportRes.resolve(exported);
              console.log(
                `startChild: ${name} started, exported=${typeof exported}`
              );
              // record port if exported value contains one
              if (
                exported &&
                typeof exported === "object" &&
                "port" in exported &&
                typeof (exported as Record<string, unknown>).port === "number"
              ) {
                const portVal = (exported as Record<string, unknown>).port;
                if (typeof portVal === "number") {
                  servicePorts.set(name, portVal);
                }
              }
            } catch (err) {
              const exportRes = exportResolvers.get(name);
              if (exportRes) exportRes.reject(err as Error);
              const ready = readyResolvers.get(name);
              if (ready) ready.resolve();
              // don't rethrow here; a failing provider should reject its export resolver
              // so dependents can observe the error without crashing the whole runner
              return;
            }

            startOrder.push(name);
            const res = readyResolvers.get(name);
            if (res) res.resolve();
            try {
              if (def.afterStart) yield* def.afterStart();
            } catch (err) {
              const exportRes = exportResolvers.get(name);
              if (exportRes) exportRes.reject(err as Error);
              const ready = readyResolvers.get(name);
              if (ready) ready.resolve();
              return;
            }

            yield* suspend();
          } finally {
            if (def.afterStop) yield* def.afterStop();
          }
        });
      }

      // small helper to await a service's dependencies
      function* waitDeps(name: string): Operation<void> {
        const def = effectiveServices[name];
        if (def.deps) {
          for (const dep of def.deps) {
            const depKey = String(dep);
            const r = readyResolvers.get(depKey);
            if (!r)
              throw new Error(
                `missing readiness resolver for dependency '${depKey}'`
              );
            yield* r.operation;
          }
        }
      }

      try {
        for (const layer of layers) {
          if (!sequential) {
            // spawn all services in this layer in parallel
            for (const name of layer) {
              // wait for deps to be ready (yield the underlying Promise)
              yield* waitDeps(name);

              // start without waiting; we'll wait for the whole layer below
              console.log(`runner: spawning child ${name}`);
              const task = yield* startChild(name);
              runningTasks.set(name, task);
            }
            // after spawning the whole layer, wait until every service in the layer is ready
            yield* waitForAllReady(layer, readyResolvers);
          } else {
            // sequential startup within this layer
            for (const name of layer) {
              // wait for deps to be ready (yield the underlying Promise)
              yield* waitDeps(name);

              // start and then wait for readiness before proceeding
              const task = yield* startChild(name);
              runningTasks.set(name, task);

              const res = readyResolvers.get(name);
              if (res) yield* res.operation;
            }
          }
        }

        yield* provide({
          services: services as S,
          serviceUpdates: runnerWatcher?.serviceUpdates,
          watches: providedWatches,
          servicePorts,
        });
      } finally {
        console.log("shutting down service graph");
        // Run beforeStop hooks in reverse start order
        console.log(
          `runner: running beforeStop hooks for ${startOrder
            .slice()
            .reverse()
            .join(",")}`
        );
        for (const name of startOrder.slice().reverse()) {
          const def = services[name];
          console.log(
            `runner: beforeStop def for ${name}: hasBeforeStop=${
              typeof def?.beforeStop === "function"
            }`
          );
          if (def?.beforeStop) {
            console.log(`runner: running beforeStop for ${name}`);
            try {
              yield* def.beforeStop();
              console.log(`runner: beforeStop for ${name} completed`);
            } catch (err) {
              console.log(`runner: beforeStop for ${name} threw`, err);
            }
          }
        }
      }
    });
}
