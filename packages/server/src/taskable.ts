import { type Operation, type Task, run, suspend } from "effection";

export type StartableTask<T> = Promise<T> & {
  start(): Promise<T>;
  halt(): Promise<void>;
  running: Task<void>;
};

export type StartedTask<T extends StartableTask<unknown>> = Awaited<ReturnType<T["start"]>>;

export type TaskableOperation<T> = Operation<T> & {
  task(): StartableTask<T>;
};

export function taskable<T, O extends Operation<T>>(operation: O): O & TaskableOperation<T> {
  let target = operation as O & TaskableOperation<T>;

  target.task = function taskableOperationTask() {
    let running!: Task<void>;
    let resolveReady!: (value: T) => void;
    let rejectReady!: (reason?: unknown) => void;

    const ready = new Promise<T>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    running = run(function* () {
      try {
        resolveReady(yield* operation);
        yield* suspend();
      } catch (error) {
        rejectReady(error);
        throw error;
      }
    });

    return Object.assign(ready, {
      running,
      start() {
        return ready;
      },
      halt() {
        return Promise.resolve(running.halt());
      },
    });
  };

  return target;
}
