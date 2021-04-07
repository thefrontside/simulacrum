import { Deferred, Task, createChannel, run, sleep, Subscription } from 'effection';
import { createClient as createWSClient, SubscribePayload } from 'graphql-ws';
import { GraphQLError } from 'graphql';

export interface Client {
  createSimulation(simulator: string): Promise<Simulation>;
  given(simulation: Simulation, scenario: string): Promise<Scenario>;
  state<T>(): AsyncIterable<T> & AsyncIterator<T>;
  dispose(): Promise<void>;
}

export interface Simulation {
  id: string;
  services: Record<string, Service>;
}

export interface WebSocketImpl {
  new(url: string): {
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  }
}

export interface Scenario<T = unknown> {
  id: string;
  status: 'running' | 'failed';
  data: T;
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

export function createClient(serverURL: string, webSocketImpl?: WebSocketImpl): Client {
  let wsurl = new URL(serverURL);
  wsurl.protocol = 'ws';
  let url = wsurl.toString();
  let ws = createWSClient({ url, webSocketImpl });

  let scope = run<void>(function*() {
    try {
      yield;
    } finally {
      let dispose = ws.dispose();
      if (dispose) {
        yield dispose;
      }
    }
  });


  function subscribe<T>(payload: SubscribePayload): Runnable<Subscription<Result<T>>> {
    return {
      run(scope: Task) {
        let { send, close, stream } = createChannel<Result<T>>();
        let { promise, resolve, reject } = Deferred<void>();
        scope.spawn(function*() {
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

  async function query<T>(field: string, payload: SubscribePayload): Promise<T> {
    return scope.spawn(function*(child) {
      yield sleep(10);
      let subscription = subscribe<Record<string, T>>(payload).run(child);
      let result: Result<Record<string, T>> = yield subscription.expect();

      return result.data[field];
    });
  }

  return {
    createSimulation: (simulator: string) => query<Simulation>("createSimulation", {
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
    }),
    given: (simulation: Simulation, scenario: string) => query<Scenario>("given", {
      query: `
mutation Given($simulation: String!, $scenario: String) {
  given(a: $scenario, simulation: $simulation)
}
`,
      variables: { scenario, simulation: simulation.id }
    }),
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
