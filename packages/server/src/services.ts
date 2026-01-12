import {
  type Operation,
  resource,
  spawn,
  withResolvers,
  each,
  type Stream,
  type WithResolvers,
} from "effection";

import { type ServiceUpdate, useWatcher } from "./watch.ts";
import { stdout } from "./logging.ts";

export type ServiceDefinition<
  S,
  T extends void | { port?: number } | unknown
> = {
  operation: Operation<T>;
  // folders/files to watch for changes which should cause a restart
  watch?: string[];
  // debounce in milliseconds to coalesce rapid changes for this service
  watchDebounce?: number;
  dependsOn?: { startup: readonly S[]; restart?: readonly S[] };
  options?: {
    // Keep an options object for future expansion or hooks; currently unused when operation is present
  };
};

type MaybeSimulation = void | { port?: number } | unknown;

export type ServiceGraph<
  S extends Record<string, ServiceDefinition<string, T>>,
  T extends MaybeSimulation
> = {
  services: {
    [service in keyof S]: ServiceDefinition<keyof S, T>;
  };
  serviceUpdates?: Stream<ServiceUpdate, unknown> | undefined;
  serviceChanges?: Stream<ServiceUpdate, unknown> | undefined;
  // map of service name => listening port (when the service exposes one)
  servicePorts?: Map<string, number> | undefined;
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
 *   B: { operation: useService('B', 'node --import tsx ./test/services/service-b.ts'), dependsOn: { startup: ['A'] } }
 * });
 *
 * Services within the same topological layer are started concurrently by default.
 * Pass an optional `options` object with `{ sequential: true }` to force services
 * within the same layer to start sequentially. Lifecycle hooks can be used to
 * perform actions before or after each service starts or stops.
 */
export function useServiceGraph<
  S extends Record<string, ServiceDefinition<string, T>>,
  T extends MaybeSimulation
>(
  services: S,
  options?: { watch?: boolean; watchDebounce?: number }
): (subset?: string[] | string) => Operation<ServiceGraph<S, T>> {
  return (subset?: string[] | string) =>
    resource(function* (provide) {
      // detect cycles in the dependency graph
      const nodes = Object.keys(services);
      const temp = new Set<string>();
      const perm = new Set<string>();

      function visit(n: string) {
        if (perm.has(n)) return;
        if (temp.has(n)) throw new Error("Cycle detected in services");
        temp.add(n);
        const def = services[n];
        const deps: readonly string[] = def.dependsOn?.startup ?? [];
        for (const d of deps) {
          if (!(d in services)) continue;
          visit(d);
        }
        temp.delete(n);
        perm.add(n);
      }

      for (const n of nodes) {
        visit(n);
      }

      let effectiveServices = services; // {} as typeof services;
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
          for (const dep of services[name].dependsOn?.startup ?? []) {
            include(String(dep));
          }
        }
        for (const name of want) include(name);

        const picked: Partial<typeof services> = {};
        for (const name of included) {
          picked[name as keyof typeof services] =
            services[name as keyof typeof services];
        }
        effectiveServices = picked as typeof services;

        yield* stdout(
          `service graph: starting with services: ${Array.from(included).join(
            ", "
          )}`
        );
      }

      const watcher = yield* useWatcher(
        effectiveServices,
        options?.watchDebounce
          ? { watchDebounce: options.watchDebounce }
          : undefined
      );

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

      // track service ports (when services expose one)
      const servicePorts = new Map<string, number>();

      function bumpService(service: string) {
        const task = status.get(service);
        if (!task) throw new Error(`missing status for service '${service}'`);
        // refresh the startup resolver
        task.startup = withResolvers<void>();
        // this allows the service to continue and halt itself
        // remove any recorded port for the service; it will be re-registered when it starts again
        servicePorts.delete(service);
        task.running.resolve();
      }

      yield* spawn(function* () {
        // restart propagation to dependents is handled by useWatcher
        for (let restartService of yield* each(watcher.serviceChanges)) {
          bumpService(restartService.service);
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

            // capture any returned listening info (e.g., from useChildSimulation)
            const maybeProvided = yield* def.operation;
            if (
              maybeProvided &&
              typeof maybeProvided === "object" &&
              "port" in maybeProvided &&
              typeof maybeProvided.port === "number"
            ) {
              servicePorts.set(service, maybeProvided.port);
            }

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
            yield* stdout(`service graph: starting service '${service}'`);
            yield* withRestarts(service);
          });
        }

        yield* provide({
          services: services as S,
          serviceUpdates: watcher?.serviceUpdates,
          serviceChanges: watcher?.serviceChanges,
          servicePorts,
        });
      } finally {
        yield* stdout("shutting down service graph");
      }
    });
}
