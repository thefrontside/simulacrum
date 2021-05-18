import { describe, it, beforeEach } from '@effection/mocha';
import { Client, Simulation, Scenario } from '@simulacrum/client';
import expect from 'expect';
import person from '../src/simulators/person';

import { createTestServer } from './helpers';

describe('person simulator', () => {
  let client: Client;

  beforeEach(function * (world) {
    client = yield world.spawn(createTestServer({
      simulators: { person }
    }));
  });

  describe('createSimulation()', () => {
    let simulation: Simulation;

    beforeEach(function*() {
      simulation = yield client.createSimulation("person");
    });

    describe('positing a person', () => {
      let person: Scenario<{ name: string}>;
        beforeEach(function*() {
          person = yield client.given(simulation, "person");
        });

      it('creates a person', function*() {
        expect(person.data.name).toEqual("Paul Waters");
      });
    });
  });
});
