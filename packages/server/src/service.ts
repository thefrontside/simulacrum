import {
  type Operation,
  type Result,
  type Stream,
  each,
  lift,
  resource,
  scoped,
  sleep,
  spawn,
} from "effection";
import { timebox } from "@effectionx/timebox";
import { exec } from "@effectionx/process";
import type { ExecOptions as ProcessOptions } from "@effectionx/process";
import { stderr, stdout } from "./logging.ts";
import { createReplaySignal } from "./createReplaySignal.ts";

type ServiceOptions = {
  wellnessCheck?: {
    operation: (stdio: Stream<string, void>) => Operation<Result<void>>;
    timeout?: number; // in ms
    frequency?: number; // in ms
  };
  processOptions?: ProcessOptions;
};

export function useService(
  _name: string,
  cmd: string,
  options: ServiceOptions = {},
): Operation<void> {
  return resource(function* (provide) {
    if (cmd.startsWith("npm")) {
      // see https://github.com/npm/cli/issues/6684
      throw new Error("scripts run with npm don't respect signals to properly shutdown");
    }
    const process = yield* exec(cmd, options.processOptions);
    const stdio = createReplaySignal<string, void>();
    const stdioAdd = lift(stdio.send);

    // forward raw stdout for logging in chunk form (no reassembly)
    yield* spawn(function* () {
      for (let line of yield* each(process.stdout)) {
        const buf = Buffer.from(line);
        const str = buf.toString();
        stdout(str);
        yield* stdioAdd(str);
        yield* each.next();
      }
    });

    yield* spawn(function* () {
      for (let line of yield* each(process.stderr)) {
        const str = Buffer.from(line).toString();
        stderr(str);
        yield* stdioAdd(str);
        yield* each.next();
      }
    });

    yield* sleep(0); // allow stdio forwarding to start

    // if supplied, wellness check to ensure it is running or timeout with result
    if (options.wellnessCheck) {
      const { operation } = options.wellnessCheck;
      const frequency = options.wellnessCheck.frequency ?? 100;
      function* untilWell() {
        while (true) {
          try {
            yield* sleep(frequency);
            const result = yield* scoped(() => operation(stdio));
            if (result && result.ok) {
              break;
            }
          } catch (error) {
            // noop, try again
          }
        }
      }

      if (options.wellnessCheck.timeout) {
        const checked = yield* timebox(options.wellnessCheck.timeout, untilWell);
        if (checked && checked.timeout) {
          throw new Error("service wellness check timed out");
        }
      } else {
        yield* untilWell();
      }
      yield* lift(stdio.close)();
    }

    yield* provide();
  });
}
