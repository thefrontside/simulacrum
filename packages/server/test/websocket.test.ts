import { describe, beforeEach, it } from '@effection/mocha';
import type { Client } from '@simulacrum/client';
import expect from 'expect';

import type { ServerState, SimulationState } from '../src/interfaces';

import { createTestServer } from './helpers';

describe('webocket transport', () => {
  let client: Client;
  let subscription: AsyncIterator<ServerState>;
  let first: IteratorResult<ServerState>;

  beforeEach(function*() {
    client = yield createTestServer({
      simulators: {
        empty: () => ({ services: {}, scenarios: {} })
      }
    });

    subscription = client.state<ServerState>();

    first = yield subscription.next();
  });

  it('can handle subscriptions', function*() {
    expect(first).toEqual({
      done: false,
      value: {
        debug: false,
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
