import { main } from '@effection/node';
import { createSimulationServer, Server } from '@simulacrum/server';
import { restSimulator } from './rest-simulator/rest-simulator';
import { OauthConfig } from './types';
import { createAuth0Simulator } from '@simulacrum/auth0';

const port = parseInt(process.env.PORT || '5000') as number;

// TODO: should come from outside
const restConfig: OauthConfig = {
  port,
  audience: "https://thefrontside.auth0.com/api/v1/",
  domain: 'localhost:4400'
};

const auth0Config = {
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
    simulators: { rest: restSimulator(restConfig), auth0: createAuth0Simulator(auth0Config) }
  });
  console.log(`simulation server running at http://localhost:${server.address.port}`);
  yield;
});
