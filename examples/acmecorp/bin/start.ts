import { main } from 'effection';
import { createAcmecorpSimulationServer, Server } from '../src/server';

main(function*() {
  let server: Server = yield createAcmecorpSimulationServer();
  console.log(`🚀 simulacrum running at http://localhost:${server.address.port}`);
  yield;
});
