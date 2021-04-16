import { Slice } from "@effection/atom";
import { Task } from "effection";
import { Runnable, ServerState, Simulator } from "./interfaces";
import { map } from './effect';
import { simulation } from './simulation';

export function createEffects(atom: Slice<ServerState>, available: Record<string, Simulator>): Runnable<void> {
  return {
    run(scope: Task) {
      scope.spawn(map(atom.slice('simulations'), simulation({
        nothing: () => ({ scenarios: {}, services: {} }),
        ...available
      })));
    }
  };
}
