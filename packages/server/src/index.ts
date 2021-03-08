import { Operation, once, Task, Deferred } from 'effection';
import express from 'express';

import type { AddressInfo } from 'net';
import { IncomingMessage, ServerResponse } from 'http';

export interface Server {
  port: number;
}

export interface ServerOptions {
  simulators: Record<string, Simulator>;
}

export interface Simulator {
  (simulation: Simulation): void;
}

export interface Simulation {
  service(handler: ServiceHandler): Simulation;
}

interface ServiceHandler {
  (request: IncomingMessage, response: ServerResponse): Operation<void>;
}

export function spawnServer(scope: Task, options: ServerOptions = { simulators: {} }): Promise<Server> {
  let startup = Deferred<Server>()

  scope.spawn(function*() {
    let app = express();
    let server = app.listen(() => {
      let { port } = server.address() as unknown as AddressInfo;
      startup.resolve({
        port
      });
    });

    scope.spawn(function*() {
      let [error]: [Error] = yield once(server, 'error');
      throw error;
    });

    try {
      yield;
    } finally {
      server.close();
    }
  })

  return startup.promise;
}
