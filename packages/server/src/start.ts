import { main } from 'effection';

import { echo } from './echo';
import type { Server } from './server';
import { createSimulationServer } from './server';
import { createHttpApp } from './http';
import person from './simulators/person';
import getPort from 'get-port';

main(function* () {

  let port = yield getPort({
    port: !!process.env.PORT ? Number(process.env.PORT) : undefined
  });

  let server: Server = yield createSimulationServer({
    debug: true,
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

  console.log(`Simulation server running on http://localhost:${address.port}`);

  yield;
});
