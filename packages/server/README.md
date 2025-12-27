# @simulacrum/server

Server capable of running multiple concurrent simulations that can be controlled by test cases, preview apps, and local developer environments.

https://github.com/thefrontside/simulacrum

> [!WARNING]  
> The server is undergoing a refactor, and this may not be required for your use case. The refactor includes allow for more simply running single simulators so this package will be primarily useful as a control plane for cases where there are many simulators under test and in use. For the previous iterations, see the `v0` branch which contain the previous functionality.

## Operation-based service orchestration

`@simulacrum/server` provides operations to start and manage services with lifecycle hooks. The recommended pattern is to create `Operation<void>` instances for each service (typically via `useService`) and pass them to `useServiceGraph` which starts the services respecting a dependency DAG and provides lifecycle hooks for startup and shutdown.

Key points:

- `useServiceGraph(services: ServicesMap): Operation<void>` — starts a DAG of services. Each service in the map is declared as a `ServiceDefinition`.
- `ServiceDefinition.operation` (required) — an `Operation<void>` which indicates the service has started. This operation may be long-lived (e.g. `useService`) or may return once the service is ready while a background child keeps the service running. See the example below.
- `deps` — an optional list of service names this service depends on; services without dependencies in the same layer are started concurrently.
- Lifecycle hooks: `beforeStart`, `afterStart`, `beforeStop`, `afterStop` — each is an `Operation<void>` that runs at the appropriate time.

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
    yield* useServiceGraph({
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
        deps: ["A"],
      },
    });
  });
});
```

Notes:

- `useServiceGraph` returns an `Operation<void>` that holds while services run and only cancels on parent scope termination.
- If you want to start services sequentially or add more advanced concurrency control, compose operations yourself and use `spawn` to control how operations run.

### Lifecycle hooks

Each `ServiceDefinition` supports lifecycle hook operations. These hooks run in the parent scope and are useful for performing orchestration tasks, logging, or writing sentinel files for integration tests. Hooks are `Operation<void>` as well.

```ts
const services = {
  A: {
    operation: useService(
      "A",
      "node --import tsx ./test/services/service-a.ts"
    ),
    afterStart: () =>
      (function* () {
        // runs after the operation returns
        console.log("A has started");
      })(),
    beforeStop: () =>
      (function* () {
        // runs during shutdown in reverse order
        console.log("A is stopping");
      })(),
  },
};
```

Notes:

- `afterStart` runs after `operation` returns (service is ready)
- `beforeStop` runs during cleanup in reverse-order of startup
- Hooks are optional and can be used together with a passed `operation` or a custom operation

Try it

```bash
# Run the server package tests
cd packages/server
npm test
```

## Examples

The `example` folder contains runnable examples demonstrating `useServiceGraph` and `useService`.

Run the basic dependency example:

```bash
cd packages/server
npm run example:basic
```

Run lifecycle hooks example:

```bash
cd packages/server
npm run example:lifecycle
```

Run concurrency layers example:

````bash
cd packages/server
npm run example:concurrency

Run examples directly (each example has its own npm script). You can also run the TypeScript module with `tsx`.

```bash
cd packages/server
npm run example:basic
npm run example:lifecycle
npm run example:concurrency
# or run a module directly:
node --import tsx ./example/basic-graph.ts
```

### Typed exports between services 💡

Services may return a value from their `operation`. That value is exposed to dependent services via an `exportsOperation` on the provider.

```ts
const services = {
  provider: {
    // provider operation returns { url: string }
    operation: useService<{ url: string }>(
      "provider",
      "node --import tsx ./example/services/provider.ts"
    ),
  },
  consumer: {
    deps: ["provider"],
    operation() {
      return (function* () {
        // access provider exports via the `services` variable
        const providerExports = yield* services.provider.exportsOperation;
        console.log("provider url:", providerExports.url);
      })();
    },
  },
};

// pass `services` to `useServiceGraph` or `simulationCLI`
````
