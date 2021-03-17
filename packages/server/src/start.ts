import { spawnSimulationServer } from './server/server';
import { main } from '@effection/node';
import { HttpHandler, Server } from './interfaces';
import { createSimulationAtom } from './server/atom';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = function echo(request, response) {
  return function * () {
    response.contentType(request.headers['content-type'] ?? "application/octet-stream");

    response.status(200).write(request.body ?? "echo");
  };
};

const serverPort = !!process.env.PORT ? Number(process.env.PORT) : undefined;

main(function* (scope) {
  let atom = createSimulationAtom();

  let { port }: Server = yield spawnSimulationServer(scope, atom, {
    simulators: {
      echo(simulation) {
        return simulation.http(app => app.post('/', echo));
      },
    },
    port: serverPort
  });

  console.log(`Simulation server running on http://localhost:${port}/graphql`);

  yield;
});
