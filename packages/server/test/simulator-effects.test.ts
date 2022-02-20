import { describe, it, beforeEach } from '@effection/mocha';
import type { Simulator } from '../src/interfaces';
import { person as createPerson } from '../src/simulators/person';
import { map } from '../src/effect';
import type { Client, Simulation } from '@simulacrum/client';
import type { Person } from '../src/simulators/person';
import { createTestServer } from './helpers';
import expect from 'expect';

describe('simulator effects', () => {
  let people: Record<string, unknown>;
  let client: Client;
  let simulation: Simulation;
  let person: Person;

  beforeEach(function* () {
    people = {};

    let test: Simulator = (slice) => ({
      services: {},
      scenarios: {
        person: createPerson
      },
      * effects() {
        yield map(slice.slice('store', 'people'), function* (slice) {
          let newPerson = slice.get();

          people[newPerson.id] = newPerson;
        });
      }
    });

    client = yield createTestServer({
      simulators: { test },
    });

    simulation = yield client.createSimulation("test");

    let entry = yield client.given(simulation, "person");

    person = entry.data;
  });

  it('should run effect', function * () {
    expect(people[person.id]).toEqual((person));
  });
});
