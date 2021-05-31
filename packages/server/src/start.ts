import { main } from '@effection/node';
import { echo } from './echo';
import { createSimulationServer, Server } from './server';
import { createHttpApp } from './http';
import person from './simulators/person';
import getPort from 'get-port';
import {logger} from '@simulacrum/logger';

main(function* () {

  let port = yield getPort({
    port: !!process.env.PORT ? Number(process.env.PORT) : undefined
  });

  let server: Server = yield createSimulationServer({
    port,
    seed: 1,
    simulators: {
      person,
      echo: () => ({
        services: {
          echo: {
            protocol: 'http',
            app: createHttpApp().post('/', echo(1))
          }
        },
        scenarios: {}
      }),
    }
  });

  let address = server.address;

  logger.start(`Simulation server running on http://localhost:${address.port}`);

  yield;
});
