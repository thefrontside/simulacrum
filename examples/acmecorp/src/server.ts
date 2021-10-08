import { createSimulationServer, Server, Simulator } from '@simulacrum/server';
import { auth0 as auth0Simulator } from '@simulacrum/auth0-simulator';
import { createLdapService } from '@simulacrum/ldap-simulator';
import { Operation } from 'effection';
export { Server } from '@simulacrum/server';
import { createData } from './data';
import { Vertex } from '@frontside/graphgen';

// herminia.kautzer@acmecorp.com, password = Bq2c8aUY58vNFqi

export function toRecord<
  T extends { [K in keyof T]: string | number | symbol | Vertex['data'] }, // added constraint
  K extends keyof T
>(array: T[], selector: K): Record<T[K], T> {
  return array.reduce((acc, item) => (acc[item[selector]] = item, acc), {} as Record<T[K], T>);
}

export function createAcmecorpSimulationServer(): Operation<Server> {
  return createSimulationServer({
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    simulators: {
      acmecorp: ((state, options) => {
        let people = createData();

        state.update(state => ({
          ...state,
          store: {
            people: {
              ...toRecord(people, 'id')
            },
          }
        }));

        console.log(`username = ${people[0].data.email}, password = ${people[0].data.password}`);


        let auth0 = auth0Simulator(state, {
          ...options,
          audience: "https://thefrontside.auth0.com/api/v1/",
          clientId: "YOUR_AUTH0_CLIENT_ID",
          scope: "openid profile email offline_access",
          port: 4400
        });

        return {
          services: {
            ...auth0.services,
            ldap: createLdapService({
              port: 389,
              baseDN: "ou=users,dc=org.com",
              bindDn: "admin@org.com",
              bindPassword: "password",
              groupDN:"ou=groups,dc=org.com"
            }, state)
          },
          scenarios: {}
        };
      }) as Simulator
    }
  });
}
