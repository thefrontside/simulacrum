import { main } from '@effection/node';
import { createSimulationServer, Server } from '@simulacrum/server';
import { auth0 } from '.';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    port,
    simulators: { auth0 }
  });
  console.log(`simulation server running at http://localhost:${server.address.port}`);
  yield;
});
