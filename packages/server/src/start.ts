import { createSimulationServer, Server, AddressInfo } from './server';
import { main } from '@effection/node';
import { echo } from './echo';
import { createHttpApp } from './http';

const serverPort = !!process.env.PORT ? Number(process.env.PORT) : undefined;

main(function* (scope) {

  let server: Server = createSimulationServer({
    port: serverPort,
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
