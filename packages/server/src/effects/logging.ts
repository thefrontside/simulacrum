import type { SimulationState } from 'src/interfaces';
import { Effect } from '../effect';
import { assert } from 'assert-ts';

export const loggingEffect = (): Effect<SimulationState> => slice => function*(scope) {
  let simulation = slice.get();
  let { debug = false } = simulation.options;

  if (debug) {
    scope.spawn(function* () {
      yield slice.filter(({ status }) => status === 'failed').forEach(function *(state) {
        assert(state.status === 'failed');

        console.error(state.error);
      });
    });
  } else {
    scope.halt();
  }
};
