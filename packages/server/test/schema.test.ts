import { describe, it, beforeEach, afterEach } from '@effection/mocha';
import express from 'express';
import expect from 'expect';
import { Server } from '../src/interfaces';
import { graphqlHTTP } from 'express-graphql';
import { schema } from '../src/schema/schema';
import { spawnHttpServer } from '../src/server';
import { SimulationContext } from '../src/schema/context';
import { GraphQLClient, gql } from 'graphql-request'

describe('graphql control api', () => {
  let server: Server;
 
  beforeEach(function * (world) {
    world.spawn(function* (){
      let app = express();

      app.use('/graphql', graphqlHTTP({ schema, graphiql: true, context: new SimulationContext() }));
      
      server = yield spawnHttpServer(world, app);
    });
  });

  afterEach(function * (world) {
    yield world.halt();
  });

  it('should create a simulation', function * () {
    let endpoint = `http://localhost:${server.port}/graphql`;

    let client = new GraphQLClient(endpoint, { headers: {} });

    let createSimulationMutation = gql`
      mutation {
        createSimulation {
          id
        }
      }
    `;    

    let { createSimulation: { id } } = yield client.request(createSimulationMutation);

    expect(typeof id).toBe('string');
  });
});