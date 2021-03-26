import { describe, it, beforeEach } from '@effection/mocha';
import expect from 'expect';
import { echo } from '../src/echo';
import { GraphQLClient, gql } from 'graphql-request';
import { fetch } from 'cross-fetch';
import { createHttpApp } from '../src/http';
import { createTestServer } from './helpers';

describe('@simulacrum/server', () => {
  let client: GraphQLClient;

  let app = createHttpApp().post('/', echo);

  beforeEach(function * (world) {
    client = yield createTestServer({
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
          },
          scenarios: {}
        })
      }
    }).run(world).client();
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

  describe('creating two servers with the same seed', () => {
    let one: GraphQLClient;
    let two: GraphQLClient;

    beforeEach(function*(world) {
      one = yield createTestServer({
        seed: 5,
        simulators: {}
      }).run(world).client();

      two = yield createTestServer({
        seed: 5,
        simulators: {}
      }).run(world).client();
    });

    it('creates simulations with the same uuid', function*() {
      let create = `mutation { createSimulation(simulators: []) { id }}`;
      let first = yield one.request(create);
      let second = yield two.request(create);

      expect(first).toBeDefined();
      expect(second).toBeDefined();

      expect(first.createSimulation).toEqual(second.createSimulation);
    });
  });
});
