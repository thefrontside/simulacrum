import { type Operation } from "effection";
import { type TinyProcess, x } from "@effectionx/tinyexec";

export type ProcessOptions = Parameters<typeof x>[2];

export function useProcess(
  cmd: string,
  options?: ProcessOptions
): Operation<TinyProcess> {
  const parts = cmd.split(/\s+/).filter(Boolean);
  const [command, ...args] = parts;
  if (!command) {
    throw new Error("useProcess: command must not be empty");
  }
  return x(command, args, {
    ...options,
    nodeOptions: { ...options?.nodeOptions, detached: true },
  });
}
