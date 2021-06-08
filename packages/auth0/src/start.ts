import { main } from '@effection/node';
import { createSimulationServer, paths, Server } from '@simulacrum/server';
import { auth0 } from '.';
import { mkcertText } from './errors/ssl';
import { existsSync } from './io/exists-sync';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  if (!existsSync(paths.ssl.pemFile)) {
    console.error(`no pem file at ${paths.ssl.pemFile}`);
    console.warn(mkcertText);

    return;
  }

  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: { auth0 }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(`simulation server running at ${url}`);

  yield;
});
