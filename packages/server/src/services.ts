import {
  type Operation,
  type Stream,
  type WithResolvers,
  resource,
  spawn,
  withResolvers,
  each,
  createContext,
} from "effection";

import { useAttributes } from "./logging.ts";
import { type ServiceUpdate, useWatcher } from "./watch.ts";
import { logger } from "./logging.ts";
import { startDataService } from "./data-service.ts";

/**
 * Context key for the Simulacrum gateway listening port.
 *
 * When `useServiceGraph` starts the optional simulacrum gateway (via the
 * `globalData` option) it sets this context value to the listening port so
 * operations in the graph (including `useSimulation` and
 * `useChildSimulation`) can discover and fetch the `/data` payload.
 */
export const SimulacrumEndpoint = createContext<number>("SimulacrumEndpoint");

export type ServiceDefinition<
  S,
  T extends void | { port?: number } | unknown,
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
  T extends MaybeSimulation,
> = {
  services: {
    [service in keyof S]: ServiceDefinition<keyof S, T>;
  };
  serviceUpdates?: Stream<ServiceUpdate, unknown> | undefined;
  serviceChanges?: Stream<ServiceUpdate, unknown> | undefined;
  status?: Map<string, ServiceStatus>;
};

export type ServiceInfo = {
  port?: number | undefined;
  pid?: number | undefined;
};

export type ServiceStatus = {
  startup: WithResolvers<void>;
  running: WithResolvers<void>;
  port?: number | undefined;
  pid?: number | undefined;
};

/**
 * Start a graph of services with dependency ordering and optional file
 * watching/restart behavior.
 *
 * Each service is defined as a `ServiceDefinition` that includes an
 * `operation: Operation<T>` which should return once the service is ready. The
 * returned runner function starts the graph and returns a `ServiceGraph` object
 * (which includes a `servicePorts` map) that can be inspected by tests.
 *
 * @param services - a map of service names to definitions
 * @param options - optional configuration: `{ globalData?, watch?, watchDebounce? }`
 * @returns a runner function `(subset?: string[] | string) => Operation<ServiceGraph<S, T>>`
 */
export function useServiceGraph<
  S extends Record<string, ServiceDefinition<string, T>>,
  T extends MaybeSimulation,
>(
  services: S,
  options?: {
    globalData?: Record<string, unknown>;
    watch?: boolean;
    watchDebounce?: number;
  },
): (subset?: string[] | string) => Operation<ServiceGraph<S, T>> {
  return (subset?: string[] | string) =>
    resource(function* (provide) {
      // detect cycles in the dependency graph
      const nodes = Object.keys(services);
      // label the root of the service graph operation
      yield* useAttributes({
        name: "serviceGraph",
        totalServices: String(nodes.length),
      });
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
            s.trim(),
          ),
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

        // annotate subset details AFTER calculations to avoid overwriting
        yield* useAttributes({
          name: "serviceGraph",
          requestedServices: Array.from(want).join(", "),
          includedServices: Array.from(included).join(", "),
        });
        yield* logger.stdout(
          `simulation starting with subset of services: ${Array.from(
            included,
          ).join(", ")}`,
        );
      }

      const status = new Map<string, ServiceStatus>();

      const dataServiceProvided = yield* startDataService(
        options?.globalData ?? {},
      );
      yield* useAttributes({
        name: "serviceGraph",
        dataServicePort: String(dataServiceProvided.port),
      });

      status.set("simulacrum", {
        startup: withResolvers<void>(),
        running: withResolvers<void>(),
        port: dataServiceProvided.port,
      });

      // set the SimulacrumEndpoint in this operation scope so children started
      // in this graph can access the port via context
      yield* SimulacrumEndpoint.set(dataServiceProvided.port);

      // start up a watcher only when the CLI or caller explicitly asks for it
      // or when at least one of the services has a `watch` configuration. by
      // default we avoid spinning up chokidar when not needed since it holds an
      // active file descriptor and has been observed to keep the process alive
      // even after the root scope has been cancelled.
      const shouldWatch =
        options?.watch === true ||
        Object.values(effectiveServices).some((d) => Array.isArray(d.watch));

      const watcher = shouldWatch
        ? yield* useWatcher(
            effectiveServices,
            options?.watchDebounce
              ? { watchDebounce: options.watchDebounce }
              : undefined,
          )
        : undefined;

      for (const name of Object.keys(effectiveServices)) {
        const def = effectiveServices[name];
        status.set(name, {
          startup: withResolvers<void>(),
          running: withResolvers<void>(),
        });
        if (def.watch && watcher) {
          watcher.add(name, def.watch);
        }
      }

      function* bumpService(service: string) {
        yield* useAttributes({
          name: "watcher",
          reason: `restarting service ${service}`,
        });
        const task = status.get(service);
        if (!task) throw new Error(`missing status for service ${service}`);
        // log so it is clear in the inspector output when a restart is triggered
        yield* logger.stdout(`restarting service ${service}`);
        // refresh the startup resolver
        task.startup = withResolvers<void>();

        // remove any recorded port/pid for the service; it will be re-registered when it starts again
        delete task.port;
        delete task.pid;

        // signal the running operation to stop so it can clean up
        task.running.resolve();
      }

      if (watcher) {
        yield* spawn(function* () {
          yield* useAttributes({
            name: "watcher",
            reason: "startup",
          });
          // restart propagation to dependents is handled by useWatcher
          for (let restartService of yield* each(watcher.serviceChanges)) {
            yield* bumpService(restartService.service);
            yield* each.next();
          }
        });
      }

      // small helper to await a service's dependencies
      function* waitDeps(name: string, restartCount: number): Operation<void> {
        const deps =
          restartCount === 0
            ? (effectiveServices[name].dependsOn?.startup ?? [])
            : (effectiveServices[name].dependsOn?.restart ?? []);
        yield* useAttributes({
          name: `service ${name}`,
          depCount: String(deps.length),
        });
        for (const dep of deps) {
          const r = status.get(dep);
          if (!r)
            throw new Error(
              `missing readiness resolver for dependency '${dep}'`,
            );
          yield* r.startup.operation;
        }
      }

      function* withRestarts(service: string) {
        // start at -1 so the first run is "restarted 0 times"
        let restartCount = -1;
        yield* useAttributes({
          name: `service ${service}`,
          dependencies: JSON.stringify(
            effectiveServices[service].dependsOn ?? {},
          ),
        });
        while (true) {
          yield* useAttributes({
            name: `service ${service}`,
            status: `restarted ${++restartCount} times`,
          });
          yield* waitDeps(service, restartCount);

          const def = effectiveServices[service];
          const task = status.get(service);
          if (!task) throw new Error(`missing status for service '${service}'`);

          // each run gets its own running resolver so we can cancel it on demand
          task.running = withResolvers<void>();

          // run the service in a scoped child operation so it can be cleanly
          // cancelled when a file change triggers a restart
          const serviceTask = yield* spawn(function* () {
            // capture any returned listening info (e.g., from useChildSimulation)
            const maybeProvided = yield* def.operation;
            if (maybeProvided && typeof maybeProvided === "object") {
              if (
                "port" in maybeProvided &&
                typeof maybeProvided.port === "number"
              ) {
                yield* useAttributes({
                  name: `service ${service}`,
                  port: String(maybeProvided.port),
                });
                task.port = maybeProvided.port;
              }
              if (
                "pid" in maybeProvided &&
                typeof maybeProvided.pid === "number"
              ) {
                task.pid = maybeProvided.pid;
                yield* useAttributes({
                  name: `service ${service}`,
                  pid: String(maybeProvided.pid),
                });
              }
            }

            task.startup.resolve();
            // wait until the watcher asks for this service to be restarted
            yield* task.running.operation;
          });
          yield* serviceTask;
        }
      }

      try {
        for (let service of Object.keys(effectiveServices)) {
          yield* spawn(function* () {
            yield* useAttributes({
              name: `service ${service}`,
            });
            yield* logger.debug(`service graph: spawning service ${service}`);
            yield* withRestarts(service);
          });
        }

        yield* provide({
          services: services as S,
          serviceUpdates: watcher?.serviceUpdates,
          serviceChanges: watcher?.serviceChanges,
          status,
        });
      } finally {
        yield* logger.debug("shutting down service graph");
      }
    });
}
