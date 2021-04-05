import { describe, beforeEach, it } from '@effection/mocha';
import { createClient, Client } from '@simulacrum/client';
import expect from 'expect';
import webSocketImpl from 'ws';

import { createSimulationServer } from '../src/index';
import { ServerState, SimulationState } from '../src/interfaces';

describe('webocket transport', () => {
  let client: Client;
  let subscription: AsyncIterator<ServerState>;
  let first: IteratorResult<ServerState>;

  beforeEach(function*(world) {
    let server = createSimulationServer({
      simulators: {
        empty: () => ({ services: {}, scenarios: {} })
      }
    }).run(world);

    let address = yield server.address();

    client = createClient(`ws://localhost:${address.port}`, webSocketImpl);

    subscription = client.state<ServerState>();

    first = yield subscription.next();
  });

  it('can handle subscriptions', function*() {
    expect(first).toEqual({
      done: false,
      value: {
        simulations: {}
      }
    });
  });

  describe('updating the state', () => {
    let result: SimulationState;
    beforeEach(function*() {
      result = yield client.createSimulation('empty');
    });

    it('emits a new record in the subscription', function*() {
      let next: IteratorYieldResult<ServerState> = yield subscription.next();
      expect(next.done).toEqual(false);
      expect(next.value.simulations[result.id].id).toEqual(result.id);
    });
  });
});
