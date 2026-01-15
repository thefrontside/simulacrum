# Server package examples

This folder contains runnable examples demonstrating `useServiceGraph` and `useService`.

There are two sets of examples:

- **use-service** (top-level files like `process-graph.ts`, `concurrency-layers.ts`) — these spawn separate processes using `useService`. Use these to exercise the process-based behavior.

- **simulation / child processes** (e.g., `simulation-graph.ts`) — these demonstrate `useChildSimulation()` which runs each service in a child process using a simulation factory. They show how to isolate simulations and start them as independent processes.

Quick commands:

Run the simulation-based example (child simulations):

```bash
cd packages/server
node --import tsx ./example/simulation-graph.ts
```

Run the process-based example (spawned processes):

```bash
cd packages/server
node --import tsx ./example/process-graph.ts
```

Run the concurrency example:

```bash
cd packages/server
node --import tsx ./example/concurrency-layers.ts
```

These examples make use of the small service implementations in `./example/services`.

Notes: the examples now use `dependsOn` with a `{ startup, restart? }` shape. To experiment with restart propagation, add a `watch` entry to a service and include dependents via `dependsOn.restart` — when a watched file changes the watcher will restart the affected service and its transitive dependents.

Global data: The simulation example (`simulation-graph.ts`) demonstrates the `globalData` option. When provided, the graph starts a small HTTP data service (the "simulacrum gateway") and registers its port on `servicePorts` under the key `"simulacrum"`. Child simulations may query this gateway at `/data` to obtain initialization data.
