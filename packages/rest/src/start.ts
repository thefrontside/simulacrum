import { main } from '@effection/node';
import { createSimulationServer, Server, Simulator } from '@simulacrum/server';
import { createRestSimulator } from './rest-simulator/rest-simulator';
import { createAuth0Simulator } from '@simulacrum/auth0';
import { auth0Config, restConfig } from './config';
import { spawn } from '@effection/core';

const port = parseInt(process.env.PORT || '5000') as number;
const backend: Simulator = (store, options) => {
  let rest = createRestSimulator(restConfig)(store, options);
  let auth0 = createAuth0Simulator(auth0Config)(store, options);

  return {
    services: { ...rest.services, ...auth0.services },
    scenarios: { ...rest.scenarios, ...auth0.scenarios },
    *effects() {
      if(!!rest.effects) {
        yield spawn(rest.effects());
      }

      if(!!auth0.effects) {
        yield spawn(auth0.effects());
      }
    }
  };
};

main(function*() {
  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: { backend }
  });
  console.log(`simulation server running at http://localhost:${server.address.port}`);

  yield;
});
