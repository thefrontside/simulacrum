import { main } from 'effection';
import { createSimulationServer, Server } from '@simulacrum/server';
import { auth0 } from '.';
import dedent from 'dedent';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    debug: true,
    seed: 1,
    port,
    simulators: { auth0 }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(dedent`Started Simulacrum simulation server on ${url}. 
  GraphiQL interface is running on ${url}/graphql.
  
  To start auth0 simulator send the following mutation to GraphQL server.
  
  mutation CreateSimulation {
   createSimulation(simulator: "auth0",
    options: {
      options:{
        audience: "[your audience]",
        scope: "[your scope]",
        clientID: "[your client-id]"
      },
      services:{
        auth0:{
          port: 4400
        }
      }
    }) {
      id
      status
      services {
        url
        name
      }
    }
  }
 `);

  yield;
});
