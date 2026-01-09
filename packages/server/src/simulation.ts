import { resource, until, spawn, each, withResolvers, Ok } from "effection";
import type { Operation } from "effection";
import { exec } from "@effectionx/process";
import { stderr, stdout } from "./logging.ts";
import type {
  FoundationSimulator,
  FoundationSimulatorListening,
} from "@simulacrum/foundation-simulator";

/**
 * Helper to start a foundation simulation server factory
 *
 * This is implemented as an Effection `resource` so cleanup is handled by the
 * `provide` finalizer when the operation's scope is closed.
 */
export function useSimulation<L extends object = Record<string, unknown>>(
  name: string,
  createFactory: () => FoundationSimulator<L>
): Operation<FoundationSimulatorListening<L>> {
  return resource(function* (provide) {
    const createSim = createFactory();
    const listening: FoundationSimulatorListening<L> = yield* until(
      createSim.listen()
    );

    console.log(`${name} simulation started on port ${listening.port}`);

    try {
      yield* provide(listening);
    } finally {
      yield* until(listening.ensureClose());
      console.log(`${name} simulation closed on port ${listening.port}`);
    }
  });
}

// Spawn a child Node process to run a simulation factory in a fresh module
// environment. This avoids sharing module cache and allows restarts to pick up
// new code. The runtime uses `bin/run-simulation-child.ts`.
export function useChildSimulation<L extends object = Record<string, unknown>>(
  name: string,
  modulePath: string
): Operation<FoundationSimulatorListening<L>> {
  return resource(function* (provide) {
    const cmd = [
      "node",
      "--import",
      "tsx",
      "./bin/run-simulation-child.ts",
      modulePath,
    ]
      .map((s) => (s.includes(" ") ? `'${s}'` : s))
      .join(" ");

    const process = yield* exec(cmd);

    // read the first stdout JSON line to get the listening info
    let listening: FoundationSimulatorListening<L> | undefined = undefined;
    let ready = withResolvers(
      "wait until the port is returned to signal ready"
    );

    // forward raw stdout for logging in chunk form (no reassembly)
    yield* spawn(function* () {
      for (let line of yield* each(process.stdout)) {
        const buf = Buffer.from(line);
        const str = buf.toString();
        console.log(`stdout: ${str}`);
        yield* stdout(str);

        if (!listening) {
          try {
            const parsed = JSON.parse(str);
            if (parsed && parsed.ready && typeof parsed.port === "number") {
              listening = {
                port: parsed.port,
              } as FoundationSimulatorListening<L>;
              ready.resolve(Ok(listening));
            }
          } catch (_) {
            // ignore lines that are not JSON
          }
        }

        yield* each.next();
      }
    });

    yield* spawn(function* () {
      for (let line of yield* each(process.stderr)) {
        const str = Buffer.from(line).toString();
        yield* stderr(str);
        yield* each.next();
      }
    });

    // spawn a watcher to detect if the child exits before printing the listening info
    let status: unknown = undefined;
    yield* spawn(function* () {
      status = yield* process.join();
      if (!listening) {
        ready.reject(
          new Error(
            `child process exited before emitting listening info: ${JSON.stringify(
              status
            )}`
          )
        );
      }
    });

    // wait to get the listening info from stdout (or reject if the process exited)
    yield* ready.operation;
    // we know listening is defined here
    listening = listening!;

    console.log(`${name} process simulation started on port ${listening.port}`);

    try {
      yield* provide(listening);
    } finally {
      console.log(`${name} simulation closed on port ${listening?.port}`);
    }
  });
}
