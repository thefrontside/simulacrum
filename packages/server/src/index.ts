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
  (simulation: Simulation): Simulation;
}

export interface Simulation {
  http(handler: (app: HttpApp) => HttpApp): Simulation;
}

export interface HttpHandler {
  (request: IncomingMessage, response: ServerResponse): Operation<void>;
}

export interface HttpApp {
  get(path: string, handler: HttpHandler): HttpApp;
  post(path: string, handler: HttpHandler): HttpApp;
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
      let error: Error = yield once(server, 'error');
      throw error;
    });

    try {
      yield;
    } finally {
      server.close();
    }
  });

  return startup.promise;
}
