import { createClient, Client } from '@simulacrum/client';
import { Resource, spawn } from 'effection';
import { ServerOptions } from '../src/interfaces';
import { createSimulationServer, Server } from '../src/server';
import WS from 'ws';

export function createTestServer(options: ServerOptions): Resource<Client> {
  return {
    *init() {
      let server: Server = yield createSimulationServer(options);
      let { port } = server.address;
      let client = createClient(`http://localhost:${port}`, WS);
      yield spawn(function*() {
        try {
          yield;
        } finally {
          client.dispose();
        }
      });
      return client;
    }
  };
}
