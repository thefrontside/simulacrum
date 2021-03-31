import { main } from '@effection/node';

import { echo } from './echo';
import { createSimulationServer, Server, AddressInfo } from './server';
import { createHttpApp } from './http';
import person from './simulators/person';

const serverPort = !!process.env.PORT ? Number(process.env.PORT) : undefined;


main(function* (scope) {

  let server: Server = createSimulationServer({
    port: serverPort,
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

  let { port }: AddressInfo = yield server.address();

  console.log(`Simulation server running on http://localhost:${port}`);

  yield;
});
