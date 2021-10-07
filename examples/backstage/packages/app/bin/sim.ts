import { main, Operation } from 'effection';
import { createSimulationServer, Server } from '@simulacrum/server';

main(function*(): Operation<void> {
  let server: Server = yield createSimulationServer({
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    simulators: {}
    //simulators: { "acmecorp": (state, options) => ({}) }
  });

  yield;
  console.log(`🚀 simulacrum running at http://${server.address.port}`)
});
