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
        "node --import tsx ./sim3.ts",
      ),
    },
  },
  { globalData: { hello: "world" } },
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
import { test, beforeEach } from "test-runner";
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

`@simulacrum/server` provides operations to start and manage services with lifecycle hooks. The recommended pattern is to create `Operation<void>` instances for each service (typically via `useService`, `useSimulation`, or `useChildSimulation`) and pass them to `useServiceGraph` which starts the services respecting a dependency DAG and provides lifecycle hooks for startup and shutdown.

See the `@simulacrum/foundation-simulator` for a basis to build simulator(s) for your services.

## API reference

### useServiceGraph(services, options?)

`useServiceGraph(services: ServicesMap, options?: { globalData?: Record<string, unknown>; watch?: boolean; watchDebounce?: number }): ServiceRunner<ServicesMap>`

Returns a "runner" function. Call the runner inside an Effection scope to start the graph:

```ts
const run = useServiceGraph(services, options);
const services = yield * run(subset); // holds while services run, subset is optional
```

File watching: pass `options.watch = true` and `options.watchDebounce` to enable watching and restart propagation across dependents. This is enabled through the CLI helper.

#### ServiceDefinition

The `ServicesMap` passed as the first argument to `useServiceGraph`.

```ts
const services: ServicesMap = {
  serviceKey: {
    operation,
    dependsOn,
    watch,
  },
};
```

##### `operation`

- Each service must provide an `operation: Operation<void>` which signals that the service has started.
- The operation needs to be long-lived or return once a child process is started while it keeps the service running in the background (e.g., `useService` or `useChildSimulation`).
- If you are defining your own customer operation, use `try { ... yield* suspend(); } finally { ... }` inside an `operation` to run cleanup logic when the service stops. Using `resource()` from `effection` allows the service to stay in scope and continue running. See the `effection` documentation or the helper functions in this library for more information and examples.

##### `dependsOn`

Type: `{ startup?: string[]; restart?: string[] }`

- `startup` lists services that must start before this one.
- `restart` lists services whose restart should trigger a restart of this service (useful when using the watcher).

##### `watch` Watching & restart propagation

To enable file‑watching: pass `{ watch: true }` to the `useServiceGraph` options (second argument) and add `watch` paths to your `ServiceDefinition` objects. The watcher is only started when you explicitly request it (and when at least one service includes `watch` paths); by default no file descriptor is opened, allowing the process to exit cleanly on SIGINT. The watcher computes transitive dependents (using `dependsOn.restart`) and emits restart updates so restarts propagate deterministically.

### ServiceRunner & returned values

The runner returned by `useServiceGraph` is itself an operation. This allows it to be portable. Define it in one spot, then import it into any CLI, start scripts or test runners of your choosing at start it there. Optionally, it takes an argument, `subset`, to only start part of the graph.

##### `subset`

When calling the runner you may pass a subset (e.g., `yield* runner(['serviceA'])` or `yield* runner('serviceA')`, the latter being a comma separated list) to start only a subset of services. Any required startup dependencies are included automatically. This is particularly use when focusing on a specific feature / feedback loop, such as in a test. Only start the services you _actually_ need.

##### returns

The "runner" returns and exposes a `services` object when executed. The started graph exposes:

- `servicePorts` — a Map of service name => listening port when a service returns `{ port: number }` from its operation. This is convenient for tests to discover HTTP endpoints. Note that these are only filled in if the `operation` supports this functionality. The `useChildSimulation` and `useSimulation` both support it.
- `services` - the object initially passed, useful for debugging
- `serviceUpdates` and `serviceChanges` - both a `Stream` (see `effection`) of updates from the watcher, useful for debugging

### Simulation & process helpers 🔧

This package provides a few helpers to run simulations and external processes in common patterns:

#### useSimulation(name, factory)

`useSimulation(name: string, createFactory: (initData?: unknown) => FoundationSimulator)`

Run a simulator _in-process_ via a factory that returns a `FoundationSimulator` (or a Promise resolving to one). Useful when you want the simulator instance in the same Node process as the runner. This API _will_ allow watching and restarts, but these restarts will not pick up changes in your code, see `useChildSimulation`.

- If `globalData` is set on the runner, `useSimulation` will fetch it from the simulacrum gateway and pass it as the `initData` argument to your factory.
- The factory should return a `FoundationSimulator` (see below). `useSimulation` calls `await simulator.listen()` to obtain `{ port }` and registers that port on `servicePorts`.

Example:

```ts
// in a service definition
operation: useSimulation("app", (initData) => {
  // do something with initData and/or pass it to your simulator through the closure
  return createFoundationSimulationServer({ port: 0 });
});
```

#### useChildSimulation(name, modulePath)

`useChildSimulation(name: string, modulePath: string)`

Run a simulator in a fresh child Node process (isolates module cache and supports restarts). Otherwise this feels the same as using `useSimulation`.

- The child is started using a wrapper, `./bin/run-simulation-child.ts <modulePath>`, and, when present, the `--simulacrum-port` is passed so the child can fetch `globalData`.
- The wrapper prints a JSON line to stdout like `{ "ready": true, "port": 12345 }` as its first ready signal. `useChildSimulation` reads that line to discover the port and registers it on `servicePorts`.
- Non-JSON stdout lines are forwarded to logs; if the child exits before emitting the ready JSON, `useChildSimulation` rejects.
- If using this with a simulator created from `@simulacrum/foundation-simulator`, all this wiring will be handled for you.

Example:

```ts
operation: useChildSimulation(
  "service-key-for-logs",
  "./simulator/my-simulator.js",
);
```

> [!WARNING]
> This does rely on having `tsx` installed which will handle the TypeScript types when running. It will allow for a simulator defined through a `.js` file or a `.ts`, so your choosing.

#### About `@simulacrum/foundation-simulator`

- A `FoundationSimulator` is a small helper that provides two key primitives you should expect from your factory:
  - `simulator.listen(): Promise<{ port: number }>` — starts the server and resolves when it is listening (the object is registered in `servicePorts`).
  - `simulator.ensureClose(): Promise<void>` — used by the runner to cleanly shut down the simulator when its containing scope is cancelled.
- Use `createFoundationSimulationServer()` to create a server that listens on an ephemeral port and returns an object compatible with `useSimulation` and `useChildSimulation`.

#### useService(name, cmd, options?)

Spawn an external process (via the configured command) and optionally run a wellness check. `useService` forwards stdout/stderr to the package logging and keeps the operation alive until it goes out of scope.

- `options`:
  - `wellnessCheck.operation(stdio)` — an operation, `Operation<>` that needs to return a `Result` (both from `effection`) to consider the service successfully started. It is passed the stdio from the process. You may use any `effection` semantics, and inspect the stdio or http calls, etc, to decide when your service is "ready".
  - `wellnessCheck.timeout` and `wellnessCheck.frequency` can be provided to control checking behavior, most useful in repeatedly `fetch`ing a `/status` or `/healthcheck` response.

#### simulationCLI(serviceGraph)

- `simulationCLI` wraps the runner in a small CLI loop and provides convenience flags: `--services`, `--watch`, and `--watch-debounce`.
- Use the CLI helper for local development workflows where you want to run your graph directly from a file (see `service-graph.ts` examples above).

## Global data & the simulacrum gateway 🔁

When you call `useServiceGraph(...)` you may pass an optional `globalData` object in the options. The runner starts a tiny local HTTP data service (the **simulacrum gateway**) that serves that object so tests and child simulations can discover configuration or shared fixtures.

- Endpoints: `GET /data` (returns the full `globalData` JSON) and `GET /data/<key>` (returns a single key, or a 404/400 as appropriate).
- Discovery: the gateway registers its listening port on the runner's `servicePorts` map under the key `"simulacrum"`. You can read the port from your test or harness with `const port = services.servicePorts!.get("simulacrum");` and then `fetch` `http://127.0.0.1:${port}/data`.
- Service integration: when starting child simulations via `useChildSimulation` / `simulationCLI` we pass the gateway port (if present) to the child. The child will fetch `/data` on startup and receive the `globalData` object. The simulator function you define may expect to receive that global object as the first argument to the function. Useful for passing "world-level" data to all of your simulators.

```ts
const runner = useServiceGraph(
  {
    child: { operation: useChildSimulation("child", "./child-main.ts") },
  },
  { globalData: { featureFlag: true } },
);

const services = yield * runner();
const simulacrumPort = services.servicePorts!.get("simulacrum");
// fetch global data in a test or helper
const res = await fetch(`http://127.0.0.1:${simulacrumPort}/data`);
const data = await res.json();
```

Notes:

The gateway is intended for local development and tests only (it is not a production data layer). Future work around this layer may include improved logging and observability. Conceptually, it provides an "orchestration status" service.

## Development

The `example` folder contains runnable examples demonstrating `useServiceGraph`. The `test` folder includes tests based on the Node test runner which pull from the `example` folder or create their own fixtures to test the APIs.
