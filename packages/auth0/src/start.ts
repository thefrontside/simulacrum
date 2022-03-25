import { main } from 'effection';
import type { Person, Server } from '@simulacrum/server';
import { createSimulationServer } from '@simulacrum/server';
import { auth0 } from '.';
import dedent from 'dedent';
import type { Scenario, Simulation } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

const args = process.argv.slice(2);

const isStandAlone = args.indexOf('--standalone') >= 0;
const userName = args.find(arg => arg.startsWith('--username='))?.split('=')[1];
const password = args.find(arg => arg.startsWith('--password='))?.split('=')[1];

function * startInStandAloneMode(url: string) {
  let client = createClient(url);

  try {
    let simulation: Simulation = yield client.createSimulation("auth0");

    let person: Scenario<Person> = yield client.given(simulation, "person", {
      email: userName,
      password
    });

    console.log(`store populated with user`);
    console.log(`username = ${person.data.email} password = ${person.data.password}`);
  } finally {
    client.dispose();
  }
}

main(function*() {
  let server: Server = yield createSimulationServer({
    debug: true,
    seed: 1,
    port,
    simulators: { auth0 }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(`Started Simulacrum simulation server on ${url}.`);

  if(isStandAlone) {
    console.log('starting in standalone mode');

    yield startInStandAloneMode(url);
  } else {
    console.log(dedent` 
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
  }

  yield;
});
