import { spawn, suspend, until } from "effection";
import type { Operation } from "effection";
import type {
  FoundationSimulator,
  FoundationSimulatorListening,
} from "@simulacrum/foundation-simulator";

/**
 * Helper to start a foundation simulation server factory and return the listening
 * information in a typed way.
 */
export function useSimulation<A extends any[], L extends object = any>(
  createFactory: (...args: A) => () => FoundationSimulator<L>
): (...args: A) => Operation<FoundationSimulatorListening<L>> {
  return function* (...args: A) {
    const createSim = createFactory(...args)();
    const listening: FoundationSimulatorListening<L> = yield* until(
      createSim.listen()
    );

    // small debug log to make it visible in tests
    // eslint-disable-next-line no-console
    console.log(`simulation started on port ${listening.port}`);

    // ensure server is closed when this operation is finalized
    yield* spawn(function* () {
      try {
        yield* suspend();
      } finally {
        yield* until(listening.ensureClose());
        // eslint-disable-next-line no-console
        console.log(`simulation closed on port ${listening.port}`);
      }
    });

    return listening;
  };
}
