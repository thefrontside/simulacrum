import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { createSimulationServer } from '../src/server';
import { echo } from '../src/echo';
import { GraphQLClient, gql } from 'graphql-request';
import { fetch } from 'cross-fetch';
import { createHttpApp } from '../src/http';

describe('@simulacrum/server', () => {
  let client: GraphQLClient;

  let app = createHttpApp().post('/', echo);

  beforeEach(function * (world) {
    let { port } = yield createSimulationServer({
      simulators: {
        echo: () => ({
          services: {
            echo: {
              protocol: 'http',
              app
            },
            ["echo.too"]: {
              protocol: 'http',
              app
            }
          }
        })
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
        { name: 'echo', url: expect.stringMatching('http://localhost') },
        { name: 'echo.too', url: expect.stringMatching('http://localhost') }
      ]);
    });

    describe('posting to the echo service', () => {
      let body: string;

      beforeEach(function*() {
        let [{ url }]: [{name: string, url: string }] = simulation.services;

        let response = yield fetch(url, { method: 'POST', body: "hello world" });
        expect(response.ok).toEqual(true);
        body = yield response.text();
      });

      it('gives you back what you gave it', function*() {
        expect(body).toEqual("hello world");
      });
    });
  });
});
