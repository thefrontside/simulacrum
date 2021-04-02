import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createSimulationServer } from '../src/server';
import person from '../src/simulators/person';
import { GraphQLClient, gql } from 'graphql-request';

describe('person simulator', () => {
  let client: GraphQLClient;

  beforeEach(function * (world) {
    let { port } = yield createSimulationServer({
      simulators: { person }
    }).run(world).address();

    let endpoint = `http://localhost:${port}/graphql`;
    client = new GraphQLClient(endpoint, { headers: {} });
  });

  describe('createSimulation()', () => {
    let simulation: Record<string, any>;

    beforeEach(function*() {
      let createSimulationMutation = gql`
mutation CreateSimulation {
  createSimulation(
    seed: 1
    simulators: ["person"]
  ) {
    id
  }
}
`;
      let result = yield client.request(createSimulationMutation);
      simulation = result.createSimulation;
      expect(simulation.id).toBeDefined();
    });

    describe('positing a person', () => {
      let person: Record<string, any>
        beforeEach(function*() {
          let { given } = yield client.request(gql`
mutation {
  given(a: "person", simulation: ${JSON.stringify(simulation.id)})
}
`);
          person = given;
        });

      it('creates a person', function*() {
        expect(person.data).toMatchObject({ name: "Paul Waters" });
      });
    });
  });
});
