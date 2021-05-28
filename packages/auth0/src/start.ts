import { main } from '@effection/node';
import { createSimulationServer, Server } from '@simulacrum/server';
import { createAuth0Simulator } from '.';
import { config } from './config';

const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;

// TODO: should come from outside
const config: OauthConfig = {
  scope: 'openid profile email offline_access',
  port: 4400,
  audience: "https://thefrontside.auth0.com/api/v1/",
  tenant: "frontside",
  clientId: 'IsuLUyWaFczCbAKQrIpVPmyBTFs4g5iq',
};

main(function*() {
  let server: Server = yield createSimulationServer({
    seed: 1,
    port,
    simulators: { auth0: createAuth0Simulator(config) }
  });
  console.log(`simulation server running at http://localhost:${server.address.port}`);
  yield;
});
