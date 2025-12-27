import {
  type Operation,
  resource,
  spawn,
  suspend,
  withResolvers,
} from "effection";

export type ServiceDefinition<T = any> = {
  // The operation that starts the service and returns when the service is ready.
  // The operation may be provided either as an `Operation` (for example the
  // `Operation<T>` returned by `useService<T>(...)`) or as a factory that
  // returns an `Operation`. The operation may return a value of any type
  // which will be exposed to dependent services via an `exportsOperation`
  // on the service definition at runtime.
  operation: Operation<T> | (() => Operation<T>);
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

export type ServicesMap = Record<string, ServiceDefinition<any>>;

// helper type to extract the return type from an Operation or an operation factory
type OpReturn<T> = T extends Operation<infer U>
  ? U
  : T extends () => Operation<infer U>
  ? U
  : never;

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
      if (!(dep in services)) {
        throw new Error(
          `Service '${name}' depends on unknown service '${dep}'`
        );
      }
      graph[dep].add(name);
      indeg[name] = (indeg[name] || 0) + 1;
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
 * Services within the same topological layer are started concurrently. Lifecycle
 * hooks can be used to perform actions before or after each service starts or stops.
 */
export function useServiceGraph<
  S extends Record<string, ServiceDefinition<any>>
>(
  services: ServicesWithExports<S> | ServicesMap,
  subset?: string[] | string
): Operation<void> {
  return resource(function* (provide) {
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

    // Map of export resolvers so services can expose a value to dependents
    const exportResolvers = new Map<
      string,
      {
        operation: Operation<any>;
        resolve: (v: any) => void;
        reject: (err: Error) => void;
      }
    >();
    for (const name of Object.keys(effectiveServices)) {
      const r = withResolvers<any>();
      exportResolvers.set(name, {
        operation: r.operation,
        resolve: r.resolve,
        reject: r.reject,
      });
      // attach exportsOperation so dependents can yield it
      (effectiveServices as any)[name].exportsOperation = r.operation;
    }

    // Keep track of start order so we can run beforeStop hooks in reverse
    const startOrder: string[] = [];

    for (const layer of layers) {
      // spawn all services in this layer in parallel
      for (const name of layer) {
        const def = effectiveServices[name];
        // wait for deps to be ready (yield the underlying Promise)
        if (def.deps) {
          for (const dep of def.deps) {
            const r = readyResolvers.get(dep);
            if (!r)
              throw new Error(
                `missing readiness resolver for dependency '${dep}'`
              );
            yield* r.operation;
          }
        }

        // spawn a child operation that runs the service and keeps it alive with suspend()
        yield* spawn(function* () {
          try {
            if (def.beforeStart) yield* def.beforeStart();

            // The caller-supplied operation starts the service and may be
            // provided as a factory function or as an already-created
            // Operation. Resolve it to an Operation here so we can yield it
            // and capture any exported value it returns.
            const operation: Operation<any> =
              typeof def.operation === "function"
                ? (def.operation as () => Operation<any>)()
                : (def.operation as Operation<any>);

            const exported = yield* operation;
            const exportRes = exportResolvers.get(name);
            if (exportRes) exportRes.resolve(exported);
            startOrder.push(name);
            const res = readyResolvers.get(name);
            if (res) res.resolve();
            if (def.afterStart) yield* def.afterStart();

            yield* suspend();
          } finally {
            // run afterStop hooks in child finalizer so they are executed after the
            // process has cleaned up
            if (def.afterStop) yield* def.afterStop();
          }
        });
      }
      // after spawning the whole layer, wait until every service in the layer is ready
      yield* waitForAllReady(layer, readyResolvers);
    }

    try {
      yield* provide();
    } finally {
      // Run beforeStop hooks in reverse start order
      for (const name of startOrder.slice().reverse()) {
        const def = services[name];
        if (def.beforeStop) {
          yield* def.beforeStop();
        }
      }
    }
  });
}
