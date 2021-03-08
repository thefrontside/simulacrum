import { once, Task, Deferred } from 'effection';
import express from 'express';

import type { AddressInfo } from 'net';

export interface Server {
  port: number;
}

export function spawnServer(scope: Task): Promise<Server> {
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
