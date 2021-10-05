import { main } from 'effection';
import { createSimulationServer, Server } from '@simulacrum/server';
import { ldap } from '.';
import dedent from 'dedent';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

main(function*() {
  let server: Server = yield createSimulationServer({
    debug: true,
    seed: 1,
    port,
    simulators: { ldap }
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(dedent`Started Simulacrum simulation server on ${url}. `);

  yield;
});
