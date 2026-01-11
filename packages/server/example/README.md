# Server package examples

This folder contains runnable examples demonstrating `useServiceGraph` and `useService`.

There are two sets of examples:

- **use-service** (top-level files like `basic-graph.ts`, `concurrency-layers.ts`) — these spawn separate processes using `useService` (e.g. `node --import tsx ./example/services/*.ts`). Use these to exercise the process-based behavior.

- **operation** (under `operation/`) — these demonstrate `useChildSimulation()` which runs each service in a child process using a simulation factory. They show how to isolate simulations and start them as independent processes.

Quick commands:

Run the basic dependency example (use-service):

```bash
cd packages/server
node --import tsx ./example/basic-graph.ts
```

Run the basic dependency example (operation):

```bash
cd packages/server
node --import tsx ./example/operation/basic-graph.ts
```

These examples make use of the small service implementations in `./example/services`.

Notes: the examples now use `dependsOn` with a `{ startup, restart? }` shape. To experiment with restart propagation, add a `watch` entry to a service and include dependents via `dependsOn.restart` — when a watched file changes the watcher will restart the affected service and its transitive dependents.
