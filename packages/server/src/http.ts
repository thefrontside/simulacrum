import { Operation, Task, once, Resource } from 'effection';
import { Request, Response, Application } from 'express';

import type { Server as HTTPServer } from 'http';
import type { AddressInfo } from 'net';
export type { AddressInfo } from 'net';

export interface Server {
  http: HTTPServer;
  address: AddressInfo;
}

export interface ServerOptions {
  port?: number
}

export function createServer(app: Application, options: ServerOptions = {}): Resource<Server> {
  return {
    *init(scope: Task) {

      let server = app.listen(options.port);

      scope.spawn(function*() {
        let error: Error = yield once(server, 'error');
        throw error;
      });

      scope.spawn(function*() {
        try {
          yield;
        } finally {
          server.close();
        }
      });

      if (!server.listening) {
        yield once(server, 'listening');
      }

      return {
        http: server,
        address: server.address() as unknown as AddressInfo
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
