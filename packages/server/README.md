# @simulacrum/server

Server capable of running multiple concurrent simulations that can be controlled by test cases, preview apps, and local developer environments.

https://github.com/thefrontside/simulacrum

## Getting Started

Set up a process or simulators such as this example `service-graph.ts`.

```ts service-graph.ts
#!/usr/bin/env node
import { run } from "effection";
import {
  useServiceGraph,
  simulationCLI,
  useChildSimulation,
  useSimulation,
  useService,
} from "@simulacrum/server";
import { simulation } from "./sim2.ts";

// define your "graph" that can be used through a CLI or as part of a test rig
export const services = useServiceGraph(
  {
    sim1: {
      operation: useChildSimulation("sim-run-as-child-process", "./sim1.ts"),
    },
    sim2: {
      operation: useSimulation("sim-run-in-same-process", simulation),
    },
    sim3: {
      operation: useService(
        "arbitray-child-process",
        "node --import tsx ./sim3.ts"
      ),
    },
  },
  { globalData: { hello: "world" } }
);

// this is a helper function which will give you a CLI around this service graph
//  if you are calling this file directly
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
```

From this, you have two main entry points. One may start it directly from your shell.

```bash
# start a local service graph defined in ./service-graph.ts
node --import tsx ./simulators/service-graph.ts
```

> [!NOTE]
> We use `--import tsx` here to automatically handle the typescript conversion. This is a separate package that you may be interested in using, but it not a hard requirement necessarily.

Secondly, we can use this in tests. It is convenient to place in an `beforeAll()` or a `beforeEach()`. This is built on `effection`, and should handle all shutdown and clean up of the services when the function passes out of lexical scope.

```ts
import { run } from "effection";
import { services } from "./simulators/service-graph.ts";

beforeEach(async () => {
  await run(function* () {
    const services = yield* services();
    // or optionally pass a subset of services to run if not all are required for this test
    const subsetOfServices = yield* services(["sim1"]);
    yield* suspend();
  });
});

test("things", async () => {
  // do testing things here
});
```

## Operation-based service orchestration

`@simulacrum/server` provides operations to start and manage services with lifecycle hooks. The recommended pattern is to create `Operation<void>` instances for each service (typically via `useService`) and pass them to `useServiceGraph` which starts the services respecting a dependency DAG and provides lifecycle hooks for startup and shutdown.

Key points:

- `useServiceGraph(services: ServicesMap, options?: { globalData?: Record<string, unknown>; watch?: boolean; watchDebounce?: number }): ServiceRunner<ServicesMap>` — returns a _runner function_ which you call to start the graph: `const run = useServiceGraph(services, options); const provided = yield* run(subset?: string[] | string);`. By default services in the same topological layer run concurrently; pass `options.watch = true` and `options.watchDebounce` to enable file watching and restart propagation.
- `ServiceDefinition.operation` (required) — an `Operation<void>` which indicates the service has started. This operation may be long-lived (e.g. `useService`) or may return once the service is ready while a background child keeps the service running. See the example below.
- `dependsOn` — an optional object `{ startup: string[]; restart?: string[] }` listing service names this service depends on. Use `startup` to list services that must start before this service; use `restart` to list services that should trigger a restart of this service when they are restarted (for example, due to a watched file change). Services without dependencies in the same layer are started concurrently by default, or serially when `options.sequential` is true.

- `subset` (runner argument) — when calling the runner returned by `useServiceGraph` you may pass a subset (e.g. `yield* run(['serviceA'])` or `yield* run('serviceA')`) to start only a subset of services; any startup dependencies required by that subset are automatically included.

- Watching & restart propagation — pass `{ watch: true }` to `useServiceGraph` and define `watch` paths in each `ServiceDefinition` to enable file watching. The watcher will precompute transitive dependents (based on `dependsOn.restart`) and automatically emit restart updates for dependents when a watched path changes, so restarts propagate efficiently and deterministically.

### Global data & the simulacrum gateway 🔁

The graph can optionally start a small local HTTP data service (the _simulacrum gateway_) to expose a `globalData` object to child simulations and tests. The gateway registers its listening port on the returned `servicePorts` map under the key `"simulacrum"`, which tests and examples can use to discover it. See the `test/child-simulation-simulacrum.test.ts` and `example/simulation-graph.ts` for examples and coverage of this flow.

### Lifecycle hooks

- Lifecycle hooks can be implemented by arranging operations and using try/finally within your service `operation` to perform startup and cleanup logic. You can keep the operation alive with `yield* suspend()` and perform cleanup in the `finally` block when the service is stopped.

Example:

```ts
import { main, spawn, sleep } from "effection";
import { useServiceGraph, useService } from "@simulacrum/server";

main(function* () {
  yield* spawn(function* () {
    // In many situations, pass `useService` directly: it returns once the
    // process is spawned and, if a wellnessCheck is provided, once the
    // wellnessCheck passes. The service is automatically shut down by
    // effection when the operation goes out of scope.
    const run = useServiceGraph({
      A: {
        operation: useService(
          "A",
          "node --import tsx ./test/services/service-a.ts"
        ),
      },
      B: {
        operation: useService(
          "B",
          "node --import tsx ./test/services/service-b.ts"
        ),
        dependsOn: { startup: ["A"] },
      },
    });
  });
});
```

Notes:

- `useServiceGraph` returns a _runner function_; calling the runner (e.g. `yield* run()`) returns an `Operation<void>` that holds while services run and only cancels on parent scope termination. The returned runner has a `.services` property for introspection and can be passed directly to `simulationCLI`.
- If you want to start services sequentially or add more advanced concurrency control, compose operations yourself and use `spawn` to control how operations run.

### Lifecycle hooks

Each `ServiceDefinition` supports lifecycle hook operations. These hooks run in the parent scope and are useful for performing orchestration tasks, logging, or writing sentinel files for integration tests. Hooks are `Operation<void>` as well.

```ts
const services = {
  A: {
    operation: (function* () {
      // start the service via useService or useChildSimulation
      yield* useService("A", "node --import tsx ./test/services/service-a.ts");
      // signal that the service is ready
      console.log("A has started");
      try {
        // keep running until cancelled
        yield* suspend();
      } finally {
        // cleanup runs automatically on scope cancellation
        console.log("A is stopping");
      }
    })(),
  },
};
```

Notes:

- Use a try/finally in your `operation` to run cleanup logic when the service is stopped
- This approach leverages Effection scopes and ensures cleanup runs in reverse dependency order when the graph is shut down
- Use `useService` or `useChildSimulation` inside your operation as needed to start underlying processes

Try it

```bash
# Run the server package tests
cd packages/server
npm test
```

## Examples

The `example` folder contains runnable examples demonstrating `useServiceGraph` and `useService`.

Run the simulation-based example (starts simulators via child simulations):

```bash
cd packages/server
npm run example:sim
```

Run the process-based example (spawns processes via `useService`):

```bash
cd packages/server
npm run example:process
```

Run the concurrency example:

```bash
cd packages/server
npm run example:concurrency
```

Run examples directly (each example module can be executed with `tsx`):

```bash
cd packages/server
node --import tsx ./example/simulation-graph.ts
node --import tsx ./example/process-graph.ts
node --import tsx ./example/concurrency-layers.ts
```

### Sharing exported values between services (note)

Previously services could expose their return value via a public `exportsOperation` that consumers could await. That mechanism has been removed in this branch as we move to a child-process-focused runner model. Provider-returned values are still delivered to dependent service factories internally, but no longer exposed as an operation on the public `services` map.

For convenience tests may use the `servicePorts` map exposed by the running graph to discover HTTP ports that services registered when they start. The `servicePorts` map is available on the object returned by the runner and contains service name => port when a service's `operation` returns an object with a `{ port: number }` property.
