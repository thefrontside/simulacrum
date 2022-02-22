import type { ServerState } from 'src/interfaces';
import { map } from '../effect';
import { assert } from 'assert-ts';
import type { Operation, Task } from 'effection';
import { spawn } from 'effection';
import type { Slice } from '@effection/atom';

export function createLogger(slice: Slice<ServerState>): Operation<void> {
  return {
    name: 'logger',
    *init(scope) {
      let task: Task = yield spawn();

      yield spawn(slice.slice("debug").forEach(function*(shouldLogErrors) {
        yield task.halt();
        if (shouldLogErrors) {
          task = yield spawn(map(slice.slice("simulations"), function*(simulation) {
            yield simulation.filter(({ status }) => status === 'failed').forEach(state => {
              assert(state.status === 'failed');
              console.error(state.error);
            });
          })).within(scope);
        }
      }));
    }
  };
}
