import { main } from '@effection/node';

import { echo } from './echo';
import { createSimulationServer, Server, AddressInfo } from './server';
import { createHttpApp } from './http';

const serverPort = !!process.env.PORT ? Number(process.env.PORT) : undefined;


main(function* (scope) {

  let server: Server = createSimulationServer({
    port: serverPort,
    seed: 1,
    simulators: {
      echo: () => ({
        services: {
          echo: {
            protocol: 'http',
            app: createHttpApp().post('/', echo)
          }
        }
      }),
    }
  }).run(scope);

  let { port }: AddressInfo = yield server.address();

  console.log(`Simulation server running on http://localhost:${port}/graphql`);

  yield;
});
