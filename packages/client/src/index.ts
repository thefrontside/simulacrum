import { Deferred, Operation, OperationIterator, Task, createChannel, run } from 'effection';
import { createClient as createWSClient, SubscribePayload } from 'graphql-ws';
import { GraphQLError } from 'graphql';

export interface Client {
  createSimulation(simulator: string): Promise<Simulation> & Cancelable;
  state<T>(): AsyncIterable<T> & AsyncIterator<T> & Cancelable;
  dispose(): Promise<void>;
}

export interface Cancelable {
  cancel(): Promise<void>;
}

export interface Simulation {
  services: Record<string, Service>;
}

export interface Service {
  name: string;
  url: URL;
}

interface Runnable<T> {
  run(scope: Task): T;
}

interface Result<T> {
  data: T;
  errors?: GraphQLError[];
}

export function createClient(serverURL: string, webSocketImpl: unknown = WebSocket): Client {
  let scope = run<void>();

  let wsurl = new URL(serverURL);
  wsurl.protocol = 'ws';
  let url = wsurl.toString();
  let ws = createWSClient({ url, webSocketImpl });

  function subscribe<T>(payload: SubscribePayload): Runnable<OperationIterator<Result<T>>> {
    return {
      run(scope: Task) {
        let { send, close, stream } = createChannel<Result<T>>();
        scope.spawn(function*() {
          let { promise, resolve, reject } = Deferred<void>();
          let unsubscribe = ws.subscribe<Result<T>>(payload, {
            next: send,
            complete: () => resolve(),
            error: reject
          });
          try {
            yield promise;
          } finally {
            close();
            unsubscribe();
          }
        });
        return stream.subscribe(scope);
      }
    };
  }

  function query<T>(payload: SubscribePayload): Operation<T> {
    return function*(scope) {
      let subscription = subscribe(payload).run(scope);
      let next: IteratorResult<Result<T>> = yield subscription.next();
      if (next.done) {
        throw new Error(`query did not return a value`);
      } else if (next.value.errors) {
        throw new Error(JSON.stringify(next.value.errors));
      } else {
        return next.value.data;
      }
    };
  }

  return {
    createSimulation(simulator: string) {
      let { promise, reject, resolve } = Deferred<Simulation>();
      let task = scope.spawn(function*() {
        try {
          let result = yield query({
            query: `
mutation CreateSimulation($simulator: String!) {
  createSimulation(simulators: [$simulator]) {
    id
    simulators
    services {
      name
      url
    }
  }
}`,
            operationName: 'CreateSimulation',
            variables: { simulator }
          });
          resolve(result.createSimulation);
        } catch (error) {
          reject(error);
        }
      });
      return Object.assign(promise, {
        cancel: () => task.halt()
      });
    },
    state<T = unknown>() {
      let child = scope.spawn();

      let subscription = subscribe<T>({
          query: `subscription { state }`
      }).run(child);

      let iterator = {
        next() {
          return child.spawn(function*() {
            let next: IteratorResult<Result<{ state: T }>> = yield subscription.next();
            if (next.done) {
              return { done: true };
            } else {
              return { done: false, value: next.value.data.state };
            }
          }) as Promise<IteratorResult<T>>;
        },
        cancel: () => child.halt(),
        [Symbol.asyncIterator]: () => iterator
      };

      return iterator;
    },
    dispose: () => scope.halt()
  };
}
