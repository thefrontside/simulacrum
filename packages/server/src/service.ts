import {
  type Operation,
  type Result,
  type Stream,
  each,
  resource,
  scoped,
  sleep,
  spawn,
} from "effection";
import { timebox } from "@effectionx/timebox";
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
  _name: string,
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
    console.log("process yielded");

    yield* spawn(function* () {
      for (let line of yield* each<string>(process.lines)) {
        yield* stdout(line);
        yield* each.next();
      }
    });
    console.log("spawned logger");

    // if supplied, wellness check to ensure it is running or timeout with result
    if (options.wellnessCheck) {
      console.log("running wellnessCheck");
      const { operation } = options.wellnessCheck;
      const frequency = options.wellnessCheck.frequency ?? 100;
      function* untilWell() {
        while (true) {
          console.log(process.lines);
          try {
            console.log(`sleeping for ${frequency}ms before wellness check`);
            yield* sleep(frequency);
            console.log("running wellness check operation");
            let result = yield* scoped(() => operation(process.lines));
            console.log({ result, options });
            if (result.ok) {
              break;
            }
            console.log("wellness check not ok, trying again");
          } catch (error) {
            // noop, try again
          }
        }
      }

      if (options.wellnessCheck.timeout) {
        const checked = yield* timebox(
          options.wellnessCheck.timeout,
          untilWell
        );
        if (checked && checked.timeout) {
          throw new Error("service wellness check timed out");
        }
      } else {
        yield* untilWell();
      }
    }

    console.log("providing");
    yield* provide();
  });
}
