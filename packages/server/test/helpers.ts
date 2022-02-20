import type { Client } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import type { Resource } from 'effection';
import { spawn } from 'effection';
import type { ServerOptions } from '../src/interfaces';
import type { Server } from '../src/server';
import { createSimulationServer } from '../src/server';

export function createTestServer(options: ServerOptions): Resource<Client> {
  return {
    *init() {
      let server: Server = yield createSimulationServer(options);
      let { port } = server.address;
      let client = createClient(`http://localhost:${port}`);
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
