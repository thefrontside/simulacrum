import { createSimulationServer, Server, Simulator } from '@simulacrum/server';
import { auth0 as auth0Simulator } from '@simulacrum/auth0-simulator';
import { createLdapService } from '@simulacrum/ldap-simulator';
import { Operation } from 'effection';
export { Server } from '@simulacrum/server';
import { createData } from './data';

export function createAcmecorpSimulationServer(): Operation<Server> {
  return createSimulationServer({
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    simulators: {
      acmecorp: ((state, options) => {
        let users = createData();


        // create a  graphgen, insert it into the state in a way that
        // auth0 can read

        // inserti nto the state in a way that the LDAP service can read,
        // or we pass it directly to the ldap simulator.

        let auth0 = auth0Simulator(state, options);
        return {
          services: {
            ...auth0.services,
            ldap: createLdapService({
              baseDN: "ou=users,dc=org.com",
              bindDn: "admin@org.com",
              bindPassword: "password",
              groupDN:"ou=groups,dc=org.com"
            })
          },
          scenarios: {}
        };
      }) as Simulator
    }
  });
}
