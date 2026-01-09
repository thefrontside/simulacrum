import {
  type Operation,
  resource,
  spawn,
  withResolvers,
  each,
  type Stream,
  type Task,
  type WithResolvers,
} from "effection";

import { type ServiceUpdate, useWatcher } from "./watch.ts";

export type ServiceDefinition<S, T> = {
  operation: Task<Operation<T>>;
  // folders/files to watch for changes which should cause a restart
  watch?: string[];
  // debounce in milliseconds to coalesce rapid changes for this service
  watchDebounce?: number;
  dependsOn?: { startup: readonly S[]; restart?: readonly S[] };
  options?: {
    // Keep an options object for future expansion or hooks; currently unused when operation is present
  };
};

export type ServiceGraph<
  S extends Record<string, ServiceDefinition<string, T>>,
  T
> = {
  services: {
    [service in keyof S]: ServiceDefinition<keyof S, T>;
  };
  serviceUpdates?: Stream<ServiceUpdate, unknown> | undefined;
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
  S extends Record<string, ServiceDefinition<string, T>>,
  T
>(
  services: S,
  options?: { watch?: boolean; watchDebounce?: number }
): (subset?: string[] | string) => Operation<ServiceGraph<S, T>> {
  // create a simple channel that emits service names when they change.
  // We intentionally do not buffer updates; missing the first few updates
  // is acceptable and sometimes desirable because they will be used to
  // restart services.

  return (subset?: string[] | string) =>
    resource(function* (provide) {
      // If a subset is provided, compute the closure including dependencies
      let effectiveServices = services; // {} as typeof services;
      if (subset) {
        // TODO subset again
        //   const want = new Set<string>(
        //     (typeof subset === "string" ? subset.split(",") : subset).map((s) =>
        //       s.trim()
        //     )
        //   );
        //   const included = new Set<string>();
        //   function include(name: keyof typeof services) {
        //     if (included.has(name)) return;
        //     if (!(name in services))
        //       throw new Error(`Requested service '${name}' not found`);
        //     included.add(name);
        //     for (const dep of services[name].deps ?? []) include(String(dep));
        //   }
        //   for (const name of want) include(name);
        //   for (const name of included) effectiveServices[name] = services[name];

        console.log(
          `service graph: starting with services: ${Object.keys(
            effectiveServices
          ).join(", ")}`
        );
      }

      const watcher = yield* useWatcher();

      const status = new Map<
        string,
        { startup: WithResolvers<void>; running: WithResolvers<void> }
      >();
      // establish watching and ready status
      for (const name of Object.keys(effectiveServices)) {
        const def = effectiveServices[name];
        status.set(name, {
          startup: withResolvers<void>(),
          running: withResolvers<void>(),
        });
        if (def.watch) {
          watcher.add(name, def.watch);
        }
      }

      function bumpService(service: string) {
        const task = status.get(service);
        if (!task) throw new Error(`missing status for service '${service}'`);
        // refresh the startup resolver
        task.startup = withResolvers<void>();
        // this allows the service to continue and halt itself
        task.running.resolve();
      }

      yield* spawn(function* () {
        for (let restartService of yield* each(watcher.serviceUpdates)) {
          bumpService(restartService.service);
          // TODO handle service.dependsOn.restart
          yield* each.next();
        }
      });

      // small helper to await a service's dependencies
      function* waitDeps(name: string, startup: boolean): Operation<void> {
        const def = effectiveServices[name];
        const deps = startup
          ? def.dependsOn?.startup ?? []
          : def.dependsOn?.restart ?? [];
        for (const dep of deps) {
          const r = status.get(dep);
          if (!r)
            throw new Error(
              `missing readiness resolver for dependency '${dep}'`
            );
          yield* r.startup.operation;
        }
      }

      function* withRestarts(service: string) {
        let startup = true;
        while (true) {
          const start = yield* spawn(function* () {
            yield* waitDeps(service, startup);
            const def = effectiveServices[service];
            const task = status.get(service);
            if (!task)
              throw new Error(`missing status for service '${service}'`);
            task.running = withResolvers<void>();
            yield* def.operation;
            task.startup.resolve();
            yield* task.running.operation;
          });
          yield* start;
          startup = false;
        }
      }

      try {
        for (let service of Object.keys(effectiveServices)) {
          yield* spawn(function* () {
            console.log(`service graph: starting service '${service}'`);
            yield* withRestarts(service);
          });
        }

        yield* provide({
          services: services as S,
          serviceUpdates: watcher?.serviceUpdates,
        });
      } finally {
        console.log("shutting down service graph");
      }
    });
}
