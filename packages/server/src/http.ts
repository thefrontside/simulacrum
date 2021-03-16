import { Deferred, Operation, Task, once } from 'effection';
import { Express } from 'express';
import type { AddressInfo } from 'net';

export type { AddressInfo } from 'net';

export interface Server {
  listening(): Operation<AddressInfo>;
}

export interface Runnable<T> {
  run(scope: Task): T;
}

export function createServer(app: Express): Runnable<Server> {
  return {
    run(scope: Task) {
      let server = app.listen();

      let bound = Deferred<void>();

      scope.spawn(function*() {
        try {
          yield once(server, 'listening');
          bound.resolve();
          yield;
        } finally {
          server.close();
        }
      });

      scope.spawn(function*() {
        let error: Error = yield once(server, 'error');
        throw error;
      });

      return {
        async listening() {
          await bound.promise;
          return server.address() as unknown as AddressInfo;
        }
      };
    }
  };
}
