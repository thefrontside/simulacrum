import { Operation, once, Resource, spawn } from 'effection';
import { Request, Response, Application } from 'express';
import type { Server as HTTPServer } from 'http';
import type { AddressInfo } from 'net';
export type { AddressInfo } from 'net';
import { paths } from './config/paths';
import type { ServerOptions as SSLOptions } from 'https';
import { createServer as createHttpsServer } from 'https';

import fs from 'fs';
import { ServiceDetails } from './interfaces';

export interface Server {
  http: HTTPServer;
  address: AddressInfo;
}

export interface ServerOptions {
  port?: number
  protocol: ServiceDetails['protocol']
}

const ssl: SSLOptions = {
  key: fs.readFileSync(
    paths.ssl.keyFile

  ),
  cert: fs.readFileSync(paths.ssl.pemFile),
} as const;

const createAppServer = (app: Application, options: ServerOptions) => {
  switch(options.protocol) {
    case 'http':
      return app.listen(options.port);
    case 'https':
      let httpsServer = createHttpsServer(ssl, app);

      return httpsServer.listen(options.port);
  }
};

export function createServer(app: Application, options: ServerOptions): Resource<Server> {
  return {
    *init() {

      let server = createAppServer(app, options);

      yield spawn(function*() {
        let error: Error = yield once(server, 'error');
        throw error;
      });

      yield spawn(function*() {
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
        address: server.address() as AddressInfo
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
