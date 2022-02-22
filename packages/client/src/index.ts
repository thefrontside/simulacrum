import type { Task, Subscription } from 'effection';
import { createFuture, createChannel, run, sleep } from 'effection';
import type { SubscribePayload } from 'graphql-ws';
import { createClient as createWSClient } from 'graphql-ws';
import webSocketImpl from 'isomorphic-ws';
import type { GraphQLError } from 'graphql';

export interface SimulationOptions {
  options?: Record<string, unknown>;
  services?: Record<string,{
    port?: number
  }>;
  key?: string
  debug?: boolean;
}

export interface Client {
  createSimulation(simulator: string, options?: SimulationOptions): Promise<Simulation>;
  destroySimulation(simulation: Simulation): Promise<boolean>;
  given<T>(simulation: Simulation, scenario: string, params?: Record<string, unknown>): Promise<Scenario<T>>;
  state<T>(): AsyncIterable<T> & AsyncIterator<T>;
  dispose(): Promise<void>;
}

export interface Simulation {
  id: string;
  status: 'new' | 'running' | 'failed',
  services: Service[];
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
  url: string;
}

interface Runnable<T> {
  run(scope: Task): T;
}

interface Result<T> {
  data: T;
  errors?: GraphQLError[];
}

export function createClient(serverURL: string): Client {
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
        let { future, produce } = createFuture<void>();
        scope.run(function*() {
          let unsubscribe = ws.subscribe<Result<T>>(payload, {
            next: send,
            complete: () => produce({ state: "completed", value: undefined }),
            error: () => null
          });
          try {
            yield future;
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
    return scope.run(function*(child) {
      yield sleep(10);
      let subscription = subscribe<Record<string, T>>(payload).run(child);
      let result: Result<Record<string, T>> = yield subscription.expect();
      return result.data[field];
    });
  }

  return {
    createSimulation: async (simulator: string, options?: SimulationOptions) => {
      return query<Simulation>("createSimulation", {
        query: `
mutation CreateSimulation($simulator: String, $options: JSON, $debug: Boolean) {
  createSimulation(simulator: $simulator, options: $options, debug: $debug) {
    id
    simulators
    status
    services {
      name
      url
    }
  }
}`,
        operationName: 'CreateSimulation',
        variables: { simulator, options, debug: !!options?.debug }
      });
    },
    given: <T = unknown>(simulation: Simulation, scenario: string, params: Record<string, unknown> = {}) => query<Scenario<T>>("given", {
      query: `
mutation Given($simulation: String!, $scenario: String, $params: JSON) {
  given(a: $scenario, simulation: $simulation, params: $params)
}
`,
      variables: { scenario, simulation: simulation.id, params }
    }),
    destroySimulation: ({ id }: Simulation) => query<boolean>("destroySimulation", {
      query: `
mutation DestroySimulation($id: String!) {
  destroySimulation(id: $id)
}`,
      variables: { id }
    }),
    state<T = unknown>() {
      let child = scope.run();

      let subscription = subscribe<T>({
          query: `subscription { state }`
      }).run(child);

      let iterator = {
        next() {
          return child.run(function*() {
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
