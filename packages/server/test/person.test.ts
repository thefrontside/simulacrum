import { describe, it, beforeEach } from '@effection/mocha';
import { createClient, Client, Simulation, Scenario } from '@simulacrum/client';
import WS from 'ws';
import expect from 'expect';
import { createSimulationServer } from '../src/server';
import person from '../src/simulators/person';


describe('person simulator', () => {
  let client: Client;

  beforeEach(function * (world) {
    let { port } = yield createSimulationServer({
      simulators: { person }
    }).run(world).address();

    let endpoint = `ws://localhost:${port}`;
    client = createClient(endpoint, WS);
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
