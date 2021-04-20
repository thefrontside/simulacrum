type Waiter<T> = (value: T) => void;

interface Queue<T> {
  push(value: T): void;
  pop(): Promise<T>;
}

export function createQueue<T>(): Queue<T> {
  let waiters: Waiter<T>[] = [];
  let values: T[] = [];

  return {
    push(value: T): void {
      let next = waiters.pop();
      if (next) {
        next(value);
      } else {
        values.push(value);
      }
    },

    pop(): Promise<T> {
      return new Promise<T>(resolve => {
        if (values.length) {
          resolve(values.shift() as T);
        } else {
          waiters.unshift(resolve);
        }
      });
    }
  };
}
