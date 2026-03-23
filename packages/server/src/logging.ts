import { type Operation, createContext, call } from "effection";
import { createApi } from "@effectionx/context-api";

export const Debugging = createContext("@simulacrum/debugging", false);

export const stdio = createApi("@simulacrum/logging", {
  *stdout(line: string): Operation<void> {
    console.log(line);
  },
  *stderr(...line: Parameters<typeof console.error>): Operation<void> {
    console.error(...line);
  },
  *debug(line: string): Operation<void> {
    const isDebugging = yield* Debugging.expect();
    if (isDebugging) console.debug(line);
  },
});

let useAttributesImpl:
  | undefined
  | ((attrs: Record<string, unknown>) => Operation<void>) = undefined;

function* resolveUseAttributes() {
  if (typeof useAttributesImpl !== "undefined") {
    return;
  }

  try {
    const effection = yield* call(() => import("effection"));
    const maybe = (effection as { useAttributes?: any }).useAttributes;
    if (typeof maybe === "function") {
      useAttributesImpl = maybe;
    } else {
      useAttributesImpl = function* () {
        return;
      } as any;
    }
  } catch {
    // no-op when useAttributes is unavailable in older effection versions
    useAttributesImpl = function* () {
      return;
    } as any;
  }
}

export function* useAttributes(attrs: Record<string, unknown>) {
  yield* resolveUseAttributes();
  if (useAttributesImpl) {
    return yield* useAttributesImpl(attrs);
  }
}

export const logger = stdio.operations;
