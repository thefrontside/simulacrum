import { Deferred, Operation, Task, once } from 'effection';
import { Express, Request, Response } from 'express';
import getPort from 'get-port';

import type { Server as HTTPServer } from 'http';
import type { AddressInfo } from 'net';
export type { AddressInfo } from 'net';

import type { Runnable } from './interfaces';

export interface Server {
  address(): Operation<AddressInfo>;
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
        async address() {
          let server = await bound.promise;
          return server.address() as unknown as AddressInfo;
        }
      };
    }
  };
}

export interface HttpHandler {
  (request: Request, response: Response): Operation<void>;
}

export type RouteHandler = {
  method: 'get' | 'post' | 'put';
  path: string;
  handler: HttpHandler;
}

export interface HttpApp {
  handlers: RouteHandler[];
  get(path: string, handler: HttpHandler): HttpApp;
  put(path: string, handler: HttpHandler): HttpApp;
  post(path: string, handler: HttpHandler): HttpApp;
}


export function createHttpApp(handlers: RouteHandler[] = []): HttpApp {
  function append(handler: RouteHandler) {
    return createHttpApp(handlers.concat(handler));
  }
  return {
    handlers,
    get: (path, handler) => append({ path, handler, method: 'get' }),
    post: (path, handler) => append({ path, handler, method: 'post' }),
    put: (path, handler) => append({ path, handler, method: 'put' })
  };
};
