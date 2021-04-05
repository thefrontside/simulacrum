import { main } from '@effection/node';

import { echo } from './echo';
import { createSimulationServer, Server, AddressInfo } from './server';
import { createHttpApp } from './http';
import person from './simulators/person';
import getPort from 'get-port';

main(function* (scope) {

  let port = yield getPort({
    port: !!process.env.PORT ? Number(process.env.PORT) : undefined
  });

  let server: Server = createSimulationServer({
    port,
    seed: 1,
    simulators: {
      person,
      echo: () => ({
        services: {
          echo: {
            protocol: 'http',
            app: createHttpApp().post('/', echo)
          }
        },
        scenarios: {}
      }),
    }
  }).run(scope);

  let address: AddressInfo = yield server.address();

  console.log(`Simulation server running on http://localhost:${address.port}`);

  yield;
});
