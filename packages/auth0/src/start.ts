import { main } from '@effection/main';
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

  yield;
});
