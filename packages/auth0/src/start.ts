import { main } from '@effection/node';
import { Client, createClient, Simulation } from '@simulacrum/client';
import { createSimulationServer, Server } from '@simulacrum/server';
import { auth0 } from '.';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: { auth0 }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(`simulation server running at ${url}`);

  let client: Client;
  let simulation: Simulation;

  client = createClient(`http://localhost:${port}`);

  simulation = yield client.createSimulation("auth0", {
    audience: 'https://thefrontside.auth0.com/api/v1/',
    scope: "openid profile email offline_access",
    port: 4400
  });

  console.log(simulation);

  try {
    yield;
  } finally {
    if(! simulation) {
      return;
    }

    client.destroySimulation(simulation);
  }
});
