import type { SimulationState } from 'src/interfaces';
import { Effect } from '../effect';
import { assert } from 'assert-ts';
import { spawn, Task } from 'effection';

export const loggingEffect = (): Effect<SimulationState> => slice => function*(scope) {
  let task: Task = yield spawn();

  yield slice.slice('debug').forEach(function*(shouldLogErrors) {
    if (shouldLogErrors) {
      yield task.halt();
      task = yield spawn(function* () {
        yield slice.filter(({ status }) => status === 'failed').forEach(function *(state) {
          assert(state.status === 'failed');

          console.error(state.error);
        });
      }).within(scope);
    }
  });
};
