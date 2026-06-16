import { type Operation, type Result, type Stream, lift, resource, scoped, sleep } from "effection";
import { useAttributes } from "./logging.ts";
import { timebox } from "@effectionx/timebox";
import { daemon, Stdio } from "@effectionx/process";
import type { ExecOptions as ProcessOptions } from "@effectionx/process";
import { createReplaySignal } from "./createReplaySignal.ts";
import { withOperationMetadata } from "./operation-metadata.ts";

type ServiceOptions = {
  wellnessCheck?: {
    operation: (stdio: Stream<string, void>) => Operation<Result<void>>;
    timeout?: number; // in ms
    frequency?: number; // in ms
  };
  processOptions?: ProcessOptions;
};

/**
 * Start a process and return an Operation that represents the running service.
 *
 * The Operation returned by useService returns when the process has started and,
 * if a wellnessCheck is provided, once the wellnessCheck passes. When run in an
 * effection scope, the operation remains active in that scope. When the operation
 * goes out of scope, effection will automatically shut down the
 * process and clean up and shut down the process.
 */
export function useService(
  name: string,
  cmd: string,
  options: ServiceOptions = {},
): Operation<void> {
  return withOperationMetadata(
    resource<void>(function* (provide) {
      yield* useAttributes({ name: `useService ${name}`, cmd: String(cmd) });
      if (cmd.startsWith("npm")) {
        // see https://github.com/npm/cli/issues/6684
        throw new Error("scripts run with npm don't respect signals to properly shutdown");
      }

      const stdio = createReplaySignal<string, void>();
      const stdioAdd = lift(stdio.send);

      yield* Stdio.around({
        *stdout(line, next) {
          const [bytes] = line;
          const str = bytes.toString();
          yield* stdioAdd(str);
          return yield* next(bytes);
        },
        *stderr(line, next) {
          const [bytes] = line;
          const str = Buffer.from(bytes).toString();
          yield* stdioAdd(str);
          return yield* next(bytes);
        },
      });

      yield* daemon(cmd, { shell: true, ...options.processOptions });

      // if supplied, wellness check to ensure it is running or timeout with result
      if (options.wellnessCheck) {
        yield* useAttributes({
          name: `useService ${name}`,
          wellnessCheck: String(true),
          frequency: String(options.wellnessCheck.frequency ?? ""),
        });
        const { operation } = options.wellnessCheck;
        const frequency = options.wellnessCheck.frequency ?? 100;
        function* untilWell() {
          yield* useAttributes({ name: `wellnessCheck` });
          while (true) {
            try {
              yield* sleep(frequency);
              const result = yield* scoped(() => operation(stdio));
              if (result && result.ok) {
                break;
              }
            } catch (ignore) {
              // noop, try again
            }
          }
        }

        if (options.wellnessCheck.timeout) {
          yield* useAttributes({
            name: `useService ${name}`,
            timeout: String(options.wellnessCheck.timeout),
          });
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
    }),
    { watchSafe: true, operationName: "useService" },
  );
}
