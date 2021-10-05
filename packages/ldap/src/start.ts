import { main } from 'effection';
import { createSimulationServer, Server } from '@simulacrum/server';
import { ldap } from '.';
import dedent from 'dedent';

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
         baseDN: "ou=users,dc=hp.com",
         bindDn: "admin@hp.com",
         bindPassword: "password",
         groupDN:"ou=groups,dc=hp.com"
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


  yield;
});
