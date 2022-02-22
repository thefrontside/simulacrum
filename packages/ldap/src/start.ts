import { main } from 'effection';
import type { Server } from '@simulacrum/server';
import { createSimulationServer } from '@simulacrum/server';
import { ldap } from '.';
import dedent from 'dedent';
import { createClient } from '@simulacrum/client';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    debug: true,
    seed: 1,
    port,
    simulators: { ldap }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(dedent`Started Simulacrum simulation server on ${url}. 
  GraphiQL interface is running on ${url}/graphql.
  
  To start ldap simulator send the following mutation to the GraphQL server.
  
  mutation CreateSimulation {
    createSimulation(simulator: "ldap",
     options: {
       options:{
         baseDN: "ou=users,dc=org.com",
         bindDn: "admin@org.com",
         bindPassword: "password",
         groupDN:"ou=groups,dc=org.com"
       },
       services:{
         ldap:{
           port: 389
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

 let client = createClient(url);

 yield client.createSimulation("ldap", {
    options: {
      baseDN: "ou=users,dc=org.com",
      bindDn: "admin@org.com",
      bindPassword: "password",
      groupDN:"ou=groups,dc=org.com"
    },
    services: {
      ldap: {
        port: 389
      }
    }
  });

  yield;
});
