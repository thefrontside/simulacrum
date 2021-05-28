import { main } from '@effection/node';
import { createSimulationServer, Server } from '@simulacrum/server';
import { createRestSimulator } from './rest-simulator/rest-simulator';
import { createAuth0Simulator } from '@simulacrum/auth0';
import { auth0Config, restConfig } from './config';

const port = parseInt(process.env.PORT || '5000') as number;

main(function*() {
  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: { rest: createRestSimulator(restConfig), auth0: createAuth0Simulator(auth0Config) }
  });
  console.log(`simulation server running at http://localhost:${server.address.port}`);
  yield;
});
