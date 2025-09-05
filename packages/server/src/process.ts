import { type Operation } from "effection";
import { type TinyProcess, x } from "@effectionx/tinyexec";

export type ProcessOptions = Parameters<typeof x>[2];

export function useProcess(
  cmd: string,
  options?: ProcessOptions
): Operation<TinyProcess> {
  let [command, ...args] = cmd.split(/\s+/);
  return x(command, args, {
    nodeOptions: { ...options, detached: true },
  });
}
