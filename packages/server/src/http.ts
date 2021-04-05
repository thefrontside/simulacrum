import { Deferred, Operation, Task, once } from 'effection';
import { Request, Response, Application } from 'express';

import type { Server as HTTPServer } from 'http';
import type { AddressInfo } from 'net';
export type { AddressInfo } from 'net';

import type { Runnable } from './interfaces';

export interface Server {
  http: HTTPServer;
  address(): Operation<AddressInfo>;
}

export interface ServerOptions {
  port?: number
}

export function createServer(app: Application, options: ServerOptions = {}): Runnable<Server> {
  return {
    run(scope: Task) {

      let bound = Deferred<HTTPServer>();
      let server = app.listen(options.port);

      scope.spawn(function*(task: Task) {

        task.spawn(function*() {
          let error: Error = yield once(server, 'error');
          throw error;
        });

        try {
          if (!server.listening) {
            yield once(server, 'listening');
          }

          bound.resolve(server);

          yield;
        } finally {
          server.close();
        }
      });

      let network = bound.promise;

      return {
        http: server,
        async address() {
          let server = await network;
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
}
