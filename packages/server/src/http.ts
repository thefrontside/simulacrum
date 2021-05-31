
import { Operation, once, Resource, spawn } from 'effection';
import type { ServerOptions as SSLOptions } from 'https';
import { Request, Response, Application } from 'express';
import { Server as HTTPServer, createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import type { AddressInfo } from 'net';
import { paths } from './config/paths';
import fs from 'fs';
import { assert } from 'assert-ts';
import { NextFunction } from 'express';
import { Service } from './interfaces';
import {logger} from '@simulacrum/logger';

export interface Server {
  http: HTTPServer;
  address: AddressInfo;
}

export interface ServerOptions {
  port?: number;
  protocol: Service['protocol'];
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
      return createHttpServer(app);
    case 'https':
      return createHttpsServer(ssl, app);
  }
};

export function createServer(app: Application, options: ServerOptions): Resource<Server> {
  return {
    *init() {

      let server = createAppServer(app, options);

      yield spawn(function*() {
        assert(!!server, 'no server');
        let error: Error & { code?: string } = yield once(server, 'error');

        if(error.code === 'EADDRINUSE') {
          logger.warn(`port ${options.port} in use, ignoring`);
          return;
        }

        throw error;
      });

      server.listen(options.port);

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

export type Middleware = (req: Request, res: Response, next: NextFunction) => void;

export interface HttpApp {
  handlers: RouteHandler[];
  middleware: Middleware[];
  get(path: string, handler: HttpHandler): HttpApp;
  put(path: string, handler: HttpHandler): HttpApp;
  post(path: string, handler: HttpHandler): HttpApp;
  use(middleware: Middleware): HttpApp;
}

export function createHttpApp(handlers: RouteHandler[] = [], middlewareHandlers: Middleware[] = []): HttpApp {
  function append(handler: RouteHandler) {
    return createHttpApp(handlers.concat(handler), middlewareHandlers);
  }
  function addMiddleware(middleware: Middleware) {
    return createHttpApp(handlers, middlewareHandlers.concat(middleware));
  }
  return {
    handlers,
    middleware: middlewareHandlers,
    get: (path, handler) => append({ path, handler, method: 'get' }),
    post: (path, handler) => append({ path, handler, method: 'post' }),
    put: (path, handler) => append({ path, handler, method: 'put' }),
    use: (middleware) => addMiddleware(middleware),
  };
}
