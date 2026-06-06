# Server package examples

This folder contains runnable examples demonstrating `useServiceGraph`, `useService`, and `useSimulation`.

The examples are:

- `process-graph.ts` — a process-based graph using `useService()` to start each service as a separate command.
- `simulation-graph.ts` — a simulation graph using `useSimulation()` to start each service in a child process with module-path-based simulator factories.
- `concurrency-layers.ts` — a simulation graph with `useSimulation()`, file watching, and restart propagation via `dependsOn.restart`.

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
