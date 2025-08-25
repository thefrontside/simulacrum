import {
  type Operation,
  type Result,
  Stream,
  each,
  resource,
  scoped,
  sleep,
  spawn,
} from "effection";
import { timebox } from "./timebox.ts";
import { type ProcessOptions, useProcess } from "./process.ts";
import { stdout } from "./logging.ts";

type ServiceOptions = {
  wellnessCheck?: {
    operation: (stdio: Stream<string, void>) => Operation<Result<void>>;
    timeout?: number; // in ms
    frequency?: number; // in ms
  };
  processOptions?: ProcessOptions;
};

export function useService(
  name: string,
  cmd: string,
  options: ServiceOptions = {}
): Operation<void> {
  return resource(function* (provide) {
    if (cmd.startsWith("npm")) {
      // see https://github.com/npm/cli/issues/6684
      throw new Error(
        "scripts run with npm don't respect signals to properly shutdown"
      );
    }
    const process = yield* useProcess(cmd, options.processOptions);

    yield* spawn(function* () {
      for (let line of yield* each<string>(process.lines)) {
        yield* stdout(line);
        yield* each.next();
      }
    });

    // if supplied, wellness check to ensure it is running or timeout with result
    if (options.wellnessCheck) {
      const { operation } = options.wellnessCheck;
      const frequency = options.wellnessCheck.frequency ?? 100;
      function* untilWell() {
        while (true) {
          try {
            yield* sleep(frequency);
            let result = yield* scoped(() => operation(process.lines));
            if (result.ok) {
              break;
            }
          } catch (error) {
            // noop, try again
          }
        }
      }

      const waiting = options.wellnessCheck.timeout
        ? timebox(options.wellnessCheck.timeout, untilWell)
        : untilWell();
      yield* waiting;
    }

    yield* provide();
  });
}
