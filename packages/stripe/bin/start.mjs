import { main } from 'effection';
import { createSimulationServer } from '@simulacrum/server';
import getPort from 'get-port';
import { createStripeService } from '../dist/stripe-service.js';

main(function* () {
  let port = yield getPort({
    port: !!process.env.PORT ? Number(process.env.PORT) : undefined
  });

  let server = yield createSimulationServer({
    port,
    seed: 1,
    simulators: {
      stripe: () => ({
        services: {
          stripe: createStripeService
        },
        scenarios: {}
      }),
    }
  });

  let address = server.address;

  console.log(`Simulation server running on http://localhost:${address.port}`);

  yield;
});