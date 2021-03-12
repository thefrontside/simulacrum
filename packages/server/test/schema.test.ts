import { describe, it, beforeEach, afterEach } from '@effection/mocha';
import express from 'express';
import expect from 'expect';
import { HttpHandler, Server } from '../src/interfaces';
import { graphqlHTTP } from 'express-graphql';
import { schema } from '../src/schema/schema';
import { spawnHttpServer } from '../src/server';
import { SimulationContext } from '../src/schema/context';
import { GraphQLClient, gql } from 'graphql-request';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

describe('graphql control api', () => {
  let server: Server;

  beforeEach(function * (world) {
    world.spawn(function* (scope){
      let app = express();

      app.use('/graphql', graphqlHTTP({ schema, graphiql: true, context: new SimulationContext(
        scope, {
          echo(simulation) {
            return simulation.http(app => {
              app.get('/', echo);
              return app;
            });
          },
        })
      }));

      server = yield spawnHttpServer(world, app);
    });
  });

  it('should create a simulation', function * () {
    let endpoint = `http://localhost:${server.port}/graphql`;

    let client = new GraphQLClient(endpoint, { headers: {} });

    let createSimulationMutation = gql`
      mutation CreateSimulation {
        createSimulation(
          simulators: ["echo"]
        ) {
          id
        }
      }
    `;

    let { createSimulation: { id } } = yield client.request(createSimulationMutation);

    expect(typeof id).toBe('string');
  });
});
