import type { Slice } from "@effection/atom";
import type { Operation, Task } from "effection";

export interface Effect<A> {
  (slice: Slice<A>): Operation<void>;
}

export function map<A>(slice: Slice<Record<string, A>>, effect: Effect<A>): Operation<void> {
  return function* (scope) {
    let effects = new Map<string, Task>();

    function* synchronize(record: Record<string, A>) {
      let keep = new Set<string>();

      // the checks for non-null `record` and `value`
      // should not be necessary, except for some weirdness
      // when removing values from our Atom means that sometimes
      // the are.
      if (record) {
        for (let [key, value] of Object.entries(record)) {
          // see comment above
          if (value) {
            if (!effects.has(key)) {
              effects.set(key, scope.run(effect(slice.slice(key))));
            }
            keep.add(key);
          }
        }
      }

      for (let [key, effect] of effects.entries()) {
        if (!keep.has(key)) {
          effects.delete(key);
          yield effect.halt();
        }
      }
    }

    yield synchronize(slice.get());

    yield slice.forEach(synchronize);
  };
}
