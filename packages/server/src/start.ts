import { createSimulationServer, Server, AddressInfo } from './server';
import { main } from '@effection/node';
import { HttpHandler } from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = function echo(request, response) {
  return function * () {
    response.contentType(request.headers['content-type'] ?? "application/octet-stream");

    response.status(200).write(request.body ?? "echo");
  };
};

const serverPort = !!process.env.PORT ? Number(process.env.PORT) : undefined;

main(function* (scope) {

  let server: Server = createSimulationServer({
    simulators: {
      echo(simulation) {
        return simulation.http(app => app.post('/', echo));
      },
    }
  }).run(scope);

  let { port }: AddressInfo = yield server.listening();

  console.log(`Simulation server running on http://localhost:${port}/graphql`);

  yield;
});
