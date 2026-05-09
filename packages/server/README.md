# @simulacrum/server

Define one graph of simulations and processes, then run that same graph from the CLI, your tests, or a local development harness.

`@simulacrum/server` is for the case where you want to describe a simulation system once and reuse it across:

- local developer workflows
- integration and end-to-end tests
- preview or test harness environments

https://github.com/thefrontside/simulacrum

## Getting Started

Start by defining a service graph once, then choose how to run it.

```ts service-graph.ts
#!/usr/bin/env node
import { useServiceGraph, simulationCLI, useSimulation, useService } from "@simulacrum/server";
import { simulation } from "./sim2.ts";

// define your "graph" that can be used through a CLI or as part of a test rig
export const services = useServiceGraph(
  {
    sim1: {
      operation: useSimulation("sim-run-as-child-process", "./sim1.ts"),
    },
    sim2: {
      operation: useSimulation("sim-run-in-same-process", simulation),
    },
    sim3: {
      operation: useService("arbitrary-child-process", "node --import tsx ./sim3.ts"),
    },
  },
  { globalData: { hello: "world" } }, // passed readonly to each simulator
);

// this is a helper function which will give you a CLI around this service graph
//  if you are calling this file directly, e.g. `node service-graph.ts`
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  simulationCLI(services);
}
```

Once you have that file, there are two common ways to use it.

### Run from the shell

```bash
# start a local service graph defined in ./service-graph.ts
node ./simulators/service-graph.ts
```

> [!NOTE]
> We use `node --import tsx file.ts` here to automatically handle the typescript conversion. This is a separate package that you may be interested in using, but it not a hard requirement necessarily. Newer versions of node also handle this for you. The latest v24 will run a typescript file directly.

### Run from a test

If you are already working with `effection`, you may use the operation directly.

```ts
import { beforeEach, test } from "@effectionx/bdd";
import { until } from "effection";
import { serviceGraph } from "./simulators/service-graph.ts";

let graph: any // TODO get a type
// note that this has an effection scope
beforeEach(function* () {
  graph = yield* serviceGraph();
  // or optionally pass a subset of services to run if not all are required for this test
  graph = yield* serviceGraph(["sim1"]);

  // when the test completes, this will be shut down automatically as it is tied
  // to an effection scope through `@effectionx/bdd`
});

test("things", function* () {
 // run your assertions against the graph state
  // for example, query the sim API
  const port = graph.status.get("a")?.port;
  const response = yield* until(fetch(`http://localhost:${port}`));
  // use response here
});
```

If you are outside an `effection` scope, we include a convenience method to use the runner's `.task()` helper and `await` it like a promise.

```ts
import { beforeEach, afterEach } from "node:test";
import { serviceGraph } from "./simulators/service-graph.ts";

let graph: any // TODO get a type
let task;
beforeEach(async () => {
  task = serviceGraph.task();
  // or optionally pass a subset of serviceGraph to run if not all are required for this test
  task = serviceGraph.task(["sim1"]);
  // when the test completes, you need to manually shut down the graph such as in the `afterEach` below
  graph = await task.start();
});

afterEach(async () => {
  await task.halt();
});

test("things", async () => {
  // run your assertions against the graph state
  // for example, query the sim API
  const port = graph.status.get("a")?.port;
  const response = await fetch(`http://localhost:${port}`);
  // use response here
});
```

## Building a Service Graph

The core building blocks are:

- `useServiceGraph(...)` coordinates startup order, restart behavior, watcher integration, and graph lifecycle
- `useSimulation(...)` starts simulators either in-process or as child processes, see `@simulacrum/foundation-simulator` or simulators built upon it
- `useService(...)` starts arbitrary child processes and can wait for a wellness check before reporting ready

Define a service graph with a key and each service/simulator operation.

```ts
const services = useServiceGraph({
  api: {
    operation: useService("api", "node --import tsx ./api.ts"),
  },
  auth: {
    operation: useSimulation("auth", "./auth-simulator.ts"),
  },
  app: {
    dependsOn: { startup: ["api", "auth"] as const },
    operation: useService("app", "node --import tsx ./app.ts"),
  },
});
```

That gives you a single runner that can be used in multiple places without redefining your system and it's interaction.

Use `useSimulation(...)` when the thing you are running is a simulator built on `@simulacrum/foundation-simulator`. Use `useService(...)` when you want to spawn a regular external process. You may define any number of dev servers and service required for your workflow as separate items in the graph.

See `@simulacrum/foundation-simulator` for a basis to build simulators for your services, or packages such as `@simulacrum/auth0-simulator` and `@simulacrum/github-api-simulator` for concrete examples.

## API reference

### useServiceGraph(services, options?)

```ts
useServiceGraph(
  services: ServicesMap,
  options?: {
    globalData?: Record<string, unknown>;
    watch?: boolean;
    watchDebounce?: number;
  },
): ServiceRunner<ServicesMap>
```

Creates a runner for a graph of services, simulators, and supporting processes.

###### Parameters

- `services` - a map of service definitions keyed by service name
- `options` - optional graph-level settings for `globalData`, file watching, and watch debounce behavior

###### Returns

- `ServiceRunner<ServicesMap>` - a runner operation factory that starts the graph when invoked

Call the runner inside an `effection` scope to start the graph:

```ts
import { type Operation, run, main } from "effection";

const graph = useServiceGraph(services, options);

// within an Operation<any> such as
main(function* () {
  const services = yield* graph(subset); // holds while services run, subset is optional
});
// or as a promise
const services = await run(() => graph(subset));
```

File watching: pass `options.watch = true` and `options.watchDebounce` to enable watching and restart propagation across dependents. This is enabled through the CLI helper.

#### ServiceDefinition: one service entry in the graph

Each item in the `ServicesMap` passed as the first argument to `useServiceGraph` is a `ServiceDefinition`.

```ts
type ServiceDefinition<T> = {
  operation: Operation<T>;
  watch?: string[];
  watchDebounce?: number;
  dependsOn?: {
    startup?: string[];
    restart?: string[];
  };
};
```

##### `operation`

- In most cases, pass `useSimulation(args)` or `useService(args)`.
- Each service must provide an `operation: Operation<void>` or another long-lived `effection` operation that resolves when the service is ready.
- The operation may also return service metadata such as `{ port: number }` or `{ port: number; pid: number }` to surface runtime information in the graph's `status` map.
- If you are defining your own custom operation, use `try { ... yield* suspend(); } finally { ... }` inside an `effection` operation or `resource()` to run cleanup logic when the service stops.

##### `dependsOn`

```ts
dependsOn?: {
  startup?: string[];
  restart?: string[];
}
```

- `startup` lists services that must start before this one.
- `restart` lists services whose restart should trigger a restart of this service (useful when using the watcher).

##### `watch` Watching & restart propagation

```ts
watch?: string[];
```

To enable file‑watching: pass `{ watch: true }` to the `useServiceGraph` options and add `watch` paths to your `ServiceDefinition` objects. The watcher is only started when you explicitly request it (and when at least one service includes `watch` paths). The watcher computes transitive dependents (using `dependsOn.restart`) and emits restart updates so restarts propagate deterministically.

#### `globalData`: simulacrum gateway data shared across the graph

When you call `useServiceGraph(...)` you may pass an optional `globalData` object in the options. The runner starts an HTTP data service, the simulacrum gateway, that serves that object so tests and child simulations can discover configuration or shared fixtures.

- Endpoints: `GET /data` returns the full `globalData` JSON and `GET /data/<key>` returns a single key, or a `404`/`400` as appropriate.
- Discovery: the gateway registers its listening port on the graph `status` map under the key `"simulacrum"`.
- Service integration: when starting child simulations via `useSimulation` or `simulationCLI`, the runner passes the gateway port to the child so it can fetch `globalData` during startup.

```ts
const runner = useServiceGraph(
  {
    child: { operation: useSimulation("child", "./child-main.ts") },
  },
  { globalData: { featureFlag: true } },
);

main(function* (): Operation<void> {
  const services = yield* runner();
  const simulacrumPort = services.status.get("simulacrum")?.port;
  const res = yield* until(fetch(`http://127.0.0.1:${simulacrumPort}/data`));
  const data = yield* until(res.json());
  console.log(data);
});
```

The gateway is intended for local development and tests only. Conceptually, it provides a small orchestration data service for the active graph.

### ServiceRunner & returned values

The runner returned by `useServiceGraph` is itself an operation. This allows it to be portable. Define it in one spot, then import it into any CLI, start scripts or test runners of your choosing at start it there. Optionally, it takes an argument, `subset`, to only start part of the graph.

##### `subset`

When calling the runner you may pass a subset (e.g. `yield* runner(["serviceA"])`). Any required startup dependencies are included automatically. This is particularly useful when focusing on a specific feature or test case.

##### returned graph

The runner operation returns an object with the following shape:

- `services` — the original service definitions passed to `useServiceGraph`
- `status` — a `Map<string, ServiceStatus>` with runtime metadata for each service, including optional `port` and `pid` when the operation returns that information
- `serviceUpdates` — a `Stream` of watcher updates when watching is enabled, otherwise `undefined`
- `serviceChanges` — a `Stream` of watcher restart events when watching is enabled, otherwise `undefined`

If a service operation returns an object like `{ port: number }` or `{ port: number; pid: number }`, that information is recorded on `status` so tests can discover listening endpoints.

This is still an `effection` operation. If you are not operating within an `effection` scope, make use of the runner's `task()` helper. It returns an awaitable promise-like handle whose `.start()` method resolves with the started graph, exposes the backing running task on `running`, and stays alive until you call `.halt()`.

### Simulation & process helpers 🔧

This package provides a few helpers to run simulations and external processes in common patterns:

#### useSimulation(name, factoryOrModulePath, options?)

`useSimulation` is built upon two main code paths.

##### `useSimulation(name: string, modulePath: string): Operation<{ port: number; pid: number }>`

Starts a simulator in a fresh child process. This is the preferred form when you want reliable watch-driven restarts and a fresh module graph on each start.

###### Parameters

- `name` - human-readable name used in logs and graph status
- `modulePath` - path to the simulator module to execute in the child process

###### Returns

- `Operation<{ port: number; pid: number }>`

```ts
operation: useSimulation("service-key-for-logs", "./simulator/my-simulator.js");
```

##### `useSimulation(name: string, createFactory: (initData?: unknown) => FoundationSimulator): Operation<{ port: number }>`

Starts a simulator in the current process. This is the simplest form when you do not need subprocess isolation or module reload semantics. If you local development setup has issues with `child_process`, this is the alternative option.

###### Parameters

- `name` - human-readable name used in logs and graph status
- `createFactory` - a function that returns a `FoundationSimulator`

###### Returns

- `Operation<{ port: number }>`

```ts
operation: useSimulation("app", (initData) => {
  // do something with initData and/or pass it to your simulator through the closure
  return createFoundationSimulationServer({ port: 0 });
});
```

If `globalData` is set on the graph runner, `useSimulation` fetches it from the simulacrum gateway and passes it as `initData` to your factory or child module.

When the factory form is used, `useSimulation` calls `await simulator.listen()` to obtain `{ port }` and records that port in the graph `status` map.

> [!WARNING]
> Watching and code reload semantics are only fully supported when the simulator runs as a subprocess. Restarting an in-process simulator does not clear the module cache.

#### Running child-process simulations

When the second argument to `useSimulation` is a module path string, it runs the simulator in a fresh child process using `./bin/run-simulation-child.ts`. This mode isolates module cache and is the recommended form for watch-driven restarts.

The child-process flow looks like this:

1. `useSimulation` starts the wrapper `./bin/run-simulation-child.ts <modulePath>`.
2. If a simulacrum gateway is running, the wrapper also receives `--simulacrum-port` so the child can fetch `globalData`.
3. The child prints a first ready line like `{ "ready": true, "port": 12345 }` to stdout.
4. `useSimulation` reads that line, captures the port, and records it in the graph `status` map.
5. Non-JSON stdout is forwarded to logs as normal.
6. If the child exits before emitting the ready line, `useSimulation` rejects.

If you build the simulator with `@simulacrum/foundation-simulator`, this wiring is handled for you.

Example:

```ts
operation: useSimulation("service-key-for-logs", "./simulator/my-simulator.js");
```

> [!WARNING]
> TypeScript child modules rely on your runtime setup supporting them, for example via `tsx`. JavaScript modules work as-is.

#### About `@simulacrum/foundation-simulator`

Use `createFoundationSimulationServer()` to create a server that returns a `FoundationSimulator`, which is the shape expected by the factory form of `useSimulation`.

#### useService(name, cmd, options?)

```ts
useService(
  name: string,
  cmd: string,
  options?: {
    wellnessCheck?: {
      operation: (stdio: Stream<string, void>) => Operation<Result<void>>;
      timeout?: number;
      frequency?: number;
    };
  },
): Operation<void>
```

Starts an external process and optionally waits for a wellness check before reporting the service as ready.

###### Parameters

- `name` - human-readable name used in logs and graph status
- `cmd` - command to execute for the service process
- `options` - optional process readiness configuration

###### Returns

- `Operation<void>` - a long-lived operation that stays active until the service is stopped

`useService` forwards stdout and stderr to the package logger and keeps the operation alive until it goes out of scope.

The `options.wellnessCheck` object supports:

- `operation(stdio)` - an operation that inspects process output and returns an Effection `Result<void>` when the service should be considered ready
- `timeout` - maximum time to wait for the wellness check to succeed
- `frequency` - polling or retry frequency for the wellness check

#### simulationCLI(serviceGraph)

- `simulationCLI` wraps the runner in a small CLI loop and provides convenience flags: `--services`, `--watch`, and `--watch-debounce`.
- Use the CLI helper for local development workflows where you want to run your graph directly from a file (see `service-graph.ts` examples above).

## Development

The `example` folder contains runnable examples demonstrating `useServiceGraph`. The `test` folder includes tests based on the Node test runner which pull from the `example` folder or create their own fixtures to test the APIs.
