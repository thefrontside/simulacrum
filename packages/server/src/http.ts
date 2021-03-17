import { Deferred, Operation, Task, once } from 'effection';
import { Express } from 'express';
import getPort from 'get-port';

import type { Server as HTTPServer } from 'http';
import type { AddressInfo } from 'net';
export type { AddressInfo } from 'net';

import type { Runnable } from './interfaces';

export interface Server {
  listening(): Operation<AddressInfo>;
}

export interface ServerOptions {
  port?: number
}

export function createServer(app: Express, options: ServerOptions = {}): Runnable<Server> {
  return {
    run(scope: Task) {

      let bound = Deferred<HTTPServer>();

      scope.spawn(function*(task: Task) {
        let port = yield getPort(options);
        let server = app.listen(port);

        task.spawn(function*() {
          let error: Error = yield once(server, 'error');
          throw error;
        });

        try {
          yield once(server, 'listening');
          bound.resolve(server);

          yield;
        } finally {
          server.close();
        }
      });


      return {
        async listening() {
          let server = await bound.promise;
          return server.address() as unknown as AddressInfo;
        }
      };
    }
  };
}
