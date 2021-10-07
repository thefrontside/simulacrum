import { createSimulationServer, Server, Simulator } from '@simulacrum/server';
import { auth0 as auth0Simulator } from '@simulacrum/auth0-simulator';
import { Operation } from 'effection';

export { Server } from '@simulacrum/server';

export function createAcmecorpSimulationServer(): Operation<Server> {
  return createSimulationServer({
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    simulators: {
      acmecorp: ((state, options) => {
        // create a  graphgen, insert it into the state in a way that
        // auth0 can read

        // inserti nto the state in a way that the LDAP service can read,
        // or we pass it directly to the ldap simulator.

        let auth0 = auth0Simulator(state, options);
        return {
          ...auth0
        };
      }) as Simulator
    }
  });
}
