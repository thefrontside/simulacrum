import { spawnServer } from './server';
import { main } from '@effection/node';
import { HttpHandler } from './interfaces';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const echo: HttpHandler = (_request, _response) => Promise.resolve();

main(function* (scope) {
  yield spawnServer(scope, {
    simulators: {
      echo(simulation) {
        return simulation.http(app => {
          app.get('/', echo);
          return app;
        });
      },
    }
  });

  yield;
});