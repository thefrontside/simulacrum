import type { Slice } from '@effection/atom';
import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { gql, GraphQLClient } from 'graphql-request';

import type { HttpHandler } from '../src/interfaces';
import { createSimulationAtom, SimulationState } from '../src/server/atom';
import { spawnSimulationServer } from '../src/server/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (request, response) => Promise.resolve();

type CreateSimulationResult = {
  createSimulation: {
    id: string;
  }
}

describe("atom", () => {
  let client: GraphQLClient;
  let atom: Slice<SimulationState>;

  describe('adds a stimulation with an http simulator', () => {
    beforeEach(function*(world) {
      atom = createSimulationAtom();

      let { port } = yield spawnSimulationServer(world, atom, {
        simulators: {
          echo({ http }) {
            return http(app => app.get('/', echo));
          },
        }
      });

      let endpoint = `http://localhost:${port}/graphql`;
      client = new GraphQLClient(endpoint, { headers: {} });
    });

    let result: CreateSimulationResult;

    beforeEach(function* () {
      let createSimulationMutation = gql`
mutation CreateSimulation {
  createSimulation(
    simulators: ["echo"]
  ) {
    id
  }
}
`;
      result = yield client.request(createSimulationMutation);
    });

    it('should add http behaviour', function*() {
      let { createSimulation: { id } } = result;

      let simulation = atom.slice('simulations', id).get();

      let echo = simulation.services[0];

      expect(echo.name).toBe('echo');
      expect(echo.protocol).toBe('http');
    });
  });

  describe('adds a stimulation with an https simulator', () => {
    beforeEach(function*(world) {
      atom = createSimulationAtom();

      let { port } = yield spawnSimulationServer(world, atom, {
        simulators: {
          auth0({ https }) {
            return https(app => app.get('/', echo));
          },
        }
      });

      let endpoint = `http://localhost:${port}/graphql`;
      client = new GraphQLClient(endpoint, { headers: {} });
    });

    let result: CreateSimulationResult;

    beforeEach(function* () {
      let createSimulationMutation = gql`
mutation CreateSimulation {
  createSimulation(
    simulators: ["auth0"]
  ) {
    id
  }
}
`;
      result = yield client.request(createSimulationMutation);
    });

    it('should add https behaviour', function*() {
      let { createSimulation: { id } } = result;

      let simulation = atom.slice('simulations', id).get();

      let echo = simulation.services[0];

      expect(echo.name).toBe('auth0');
      expect(echo.protocol).toBe('https');
    });
  });
});
