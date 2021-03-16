import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { HttpHandler } from '../src/interfaces';
import { spawnSimulationServer } from '../src/server/server';
import { GraphQLClient, gql } from 'graphql-request';
import { createSimulationAtom } from '../src/server/atom';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe('graphql control api', () => {
  let client: GraphQLClient;

  beforeEach(function * (world) {
    let atom = createSimulationAtom();
    let { port } = yield spawnSimulationServer(world, atom, {
      simulators: {
        echo(behaviors) {
          return behaviors.http(app => app.get('/', echo));
        }
      }
    });

    let endpoint = `http://localhost:${port}/graphql`;
    client = new GraphQLClient(endpoint, { headers: {} });
  });

  describe('createSimulation()', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
