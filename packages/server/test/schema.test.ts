import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { HttpHandler } from '../src/interfaces';
import { createSimulationServer } from '../src/server';
import { GraphQLClient, gql } from 'graphql-request';

const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe('graphql control api', () => {
  let client: GraphQLClient;

  beforeEach(function * (world) {
    let { port } = yield createSimulationServer({
      simulators: {
        echo(behaviors) {
          return behaviors.http(app => app.get('/', echo));
        }
      }
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
    simulators: ["echo"]
  ) {
    id
    services {
      name
      url
    }
  }
}
`;
      let result = yield client.request(createSimulationMutation);
      simulation = result.createSimulation;
    });

    it('creates a simulation', function * () {
      expect(typeof simulation.id).toBe('string');
    });

    it('has the echo service', function* () {
      expect(simulation.services).toEqual([
        { name: 'echo', url: expect.stringMatching('http://localhost') }
      ]);
    });
  });
});
