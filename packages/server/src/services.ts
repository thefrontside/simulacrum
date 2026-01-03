import { type Operation, spawn, suspend, withResolvers } from "effection";

export type ServiceDefinition<T = any> = {
  // The operation that starts the service and returns when the service is ready.
  // The operation may be provided either as an `Operation` (for example the
  // `Operation<T>` returned by `useService<T>(...)`) or as a factory that
  // returns an `Operation`. The operation may return a value of any type
  // which will be exposed to dependent services via an `exportsOperation`
  // on the service definition at runtime.
  // Accept either an `Operation<T>` or a factory `() => Operation<T>`.
  operation: Operation<T> | ((...args: any[]) => Operation<T>);
  // optional runtime field - the operation that resolves to the exported value
  exportsOperation?: Operation<T>;
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
  operation: Operation<T> | ((...args: ArgsTuple<S, K>) => Operation<T>);
  exportsOperation?: Operation<T>;
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

// Augment a service map type to include an optional `exportsOperation` for each
// service keyed by the return type of its `operation`.
export type ServicesWithExports<S extends Record<string, { operation: any }>> =
  {
    [K in keyof S]: S[K] & {
      exportsOperation?: Operation<OpReturn<S[K]["operation"]>>;
    };
  };

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
  readyResolvers: Map<string, any>
): Operation<void> {
  for (const n of names) {
    const r = readyResolvers.get(n);
    if (r) {
      yield* r.operation;
    }
  }
}

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
export type ServiceRunner<S extends Record<string, any>> = {
  (subset?: string[] | string): Operation<void>;
  services: S;
};

export function useServiceGraph<S extends Record<string, any>>(
  services: { [K in keyof S]: ServiceDefinitionFor<S, K> } & S,
  options?: { sequential?: boolean }
): ServiceRunner<S> {
  // Create export resolvers and attach `exportsOperation` on the original
  // `services` object synchronously so callers (even those that spawn the
  // graph) can access exported values immediately.
  const exportResolvers = new Map<
    string,
    {
      operation: Operation<any>;
      resolve: (v: any) => void;
      reject: (err: Error) => void;
    }
  >();
  for (const name of Object.keys(services)) {
    const r = withResolvers<any>();
    exportResolvers.set(name, {
      operation: r.operation,
      resolve: r.resolve,
      reject: (err: Error) => r.reject(err),
    });
    (services as any)[name].exportsOperation = r.operation;
  }

  const runner = function* (subset?: string[] | string) {
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
        for (const dep of services[name].deps ?? []) include(dep);
      }
      for (const name of want) include(name);
      effectiveServices = {} as ServicesMap;
      for (const name of included) effectiveServices[name] = services[name];
    }

    const layers = computeLevels(effectiveServices);

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

    // helper to spawn and run a single service name
    function startChild(name: string): Operation<any> {
      const def = effectiveServices[name];
      return spawn(function* () {
        try {
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
          const depObj: Record<string, any> = {};
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
          let operation: Operation<any>;
          try {
            operation =
              typeof def.operation === "function"
                ? (
                    def.operation as (
                      args: Record<string, any>
                    ) => Operation<any>
                  )(depObj)
                : (def.operation as Operation<any>);
          } catch (err) {
            const exportRes = exportResolvers.get(name);
            if (exportRes) exportRes.reject(err as Error);
            const ready = readyResolvers.get(name);
            if (ready) ready.resolve();
            return;
          }

          let exported: any;
          try {
            exported = yield* operation;
            const exportRes = exportResolvers.get(name);
            if (exportRes) exportRes.resolve(exported);
          } catch (err) {
            const exportRes = exportResolvers.get(name);
            if (exportRes) exportRes.reject(err as Error);
            const ready = readyResolvers.get(name);
            if (ready) ready.resolve();
            // don't rethrow here; a failing provider should reject its exportsOperation
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

    for (const layer of layers) {
      if (!sequential) {
        // spawn all services in this layer in parallel
        for (const name of layer) {
          // wait for deps to be ready (yield the underlying Promise)
          yield* waitDeps(name);

          // start without waiting; we'll wait for the whole layer below
          yield* startChild(name);
        }
        // after spawning the whole layer, wait until every service in the layer is ready
        yield* waitForAllReady(layer, readyResolvers);
      } else {
        // sequential startup within this layer
        for (const name of layer) {
          // wait for deps to be ready (yield the underlying Promise)
          yield* waitDeps(name);

          // start and then wait for readiness before proceeding
          yield* startChild(name);

          const res = readyResolvers.get(name);
          if (res) yield* res.operation;
        }
      }
    }

    try {
      yield* suspend();
    } finally {
      // Run beforeStop hooks in reverse start order
      for (const name of startOrder.slice().reverse()) {
        const def = services[name];
        if (def.beforeStop) {
          yield* def.beforeStop();
        }
      }
    }
  } as any as ServiceRunner<S>;

  // attach the source services for introspection (CLI helpers can access)
  (runner as any).services = services;

  // return a function (generator) that can be invoked to run the graph
  return runner;
}
