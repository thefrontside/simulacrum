import type { Operation } from "effection";
import { createApi } from "@effectionx/context-api";

export const stdio = createApi("@simulacrum/logging", {
  *stdout(line: string): Operation<void> {
    console.log(line);
  },
});

export const { stdout } = stdio.operations;
