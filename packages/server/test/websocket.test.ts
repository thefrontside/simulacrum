import { describe, beforeEach, it } from '@effection/mocha';
import { Deferred, createChannel, Operation, OperationIterator, Task } from 'effection';
import expect from 'expect';
import { Client, createClient, SubscribePayload } from 'graphql-ws';
import webSocketImpl from 'ws';

import { createSimulationServer } from '../src/index';
import { Runnable, ServerState } from '../src/interfaces';

describe('webocket transport', () => {
  let client: Client;
  let subscription: OperationIterator<ServerState>;
  let first: IteratorResult<ServerState>;

  beforeEach(function*(world) {
    let server = createSimulationServer({
      simulators: {
        empty: () => ({ services: {}, scenarios: {} })
      }
    }).run(world);

    let address = yield server.address();

    client = createClient({
      url: `ws://localhost:${address.port}`,
      webSocketImpl
    });

    subscription = subscribe<ServerState>(client, {
      query: 'subscription { state }'
    }).run(world);

    first = yield subscription.next();
  });

  it('can handle subscriptions', function*() {
    expect(first).toEqual({
      done: false,
      value: {
        data: {
          state: {
            simulations: {}
          }
        }
      }
    });
  });

  describe('updating the state', () => {
    let result: any;
    beforeEach(function*() {
      result = yield query<Record<string, unknown>>(client, {
        query: `mutation Create($sim: String!) { createSimulation(simulators: [$sim]) { id } }`,
        variables: { sim: 'empty' }
      });
    });

    it('emits a new record in the subscription', function*() {
      let next = yield subscription.next();
      expect(next.done).toEqual(false);
      expect(next.value.data.state.simulations[result.createSimulation.id].id).toEqual(result.createSimulation.id);
    });

  });
});


function subscribe<T>(client: Client, payload: SubscribePayload): Runnable<OperationIterator<T>> {
  return {
    run(scope: Task) {
      let { send, close, stream } = createChannel<T>();
      scope.spawn(function*() {
        let { promise, resolve, reject } = Deferred<void>();
        let unsubscribe = client.subscribe<T>(payload, {
          next: send,
          complete: () => resolve(),
          error: reject
        });
        try {
          yield promise;
          close();
        } finally {
          unsubscribe();
        }
      });
      return stream.subscribe(scope);
    }
  };
}

function query<T>(client: Client, payload: SubscribePayload): Operation<T> {
  return function*(scope) {
    let subscription = subscribe(client, payload).run(scope);
    let next = yield subscription.next();
    if (next.done) {
      throw new Error(`query did not return a value`);
    } else if (next.value.errors) {
      throw new Error(`${next.value.errors}`);
    } else {
      return next.value.data;
    }
  };
}
