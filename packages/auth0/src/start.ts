import { main } from '@effection/node';
import { createSimulationServer, Server } from '@simulacrum/server';
import { auth0 } from '.';
import {logger} from '@simulacrum/logger';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: { auth0 }
  });
  logger.start(`simulation server running at http://localhost:${server.address.port}`);
  yield;
});
