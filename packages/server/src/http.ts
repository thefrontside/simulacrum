import type { ServerOptions as SSLOptions } from 'https';
import type { AddressInfo } from 'net';
import type { LegacyServiceCreator } from './interfaces';
import type { Operation, Resource } from 'effection';
import { once, spawn, createFuture, label } from 'effection';
import type { Request, Response, Application, RequestHandler } from 'express';
import { createServer as createHttpsServer } from 'https';
import type { Server as HTTPServer } from 'http';
import { createServer as createHttpServer } from 'http';
import { paths } from './config/paths';
import fs from 'fs';
import { mkcertText, NoSSLError } from './errors/ssl/ssl-error';
export interface Server {
  http: HTTPServer;
  address: AddressInfo;
}

export interface ServerOptions {
  port?: number;
  protocol: LegacyServiceCreator['protocol'];
}

const createAppServer = (app: Application, options: ServerOptions) => {
  switch(options.protocol) {
    case 'http':
      return createHttpServer(app);
    case 'https':
      if([paths.ssl.keyFile, paths.ssl.pemFile].some(f => !fs.existsSync(f))){
        console.warn(mkcertText);

        throw new NoSSLError('no self signed certificate.');
      }

      // mkcert does not generate a fullchain certificate
      // https://github.com/FiloSottile/mkcert/issues/76
      // one solution is to monkey patch secureContext
      // https://medium.com/trabe/monkey-patching-tls-in-node-js-to-support-self-signed-certificates-with-custom-root-cas-25c7396dfd2a
      let ssl: SSLOptions = {
        key: fs.readFileSync(
          paths.ssl.keyFile
        ),
        cert: fs.readFileSync(paths.ssl.pemFile),
      } as const;

      return createHttpsServer(ssl, app);
  }
};

export function createServer(app: Application, options: ServerOptions): Resource<Server> {
  return {
    name: 'http-server',
    labels: { protocol: options.protocol },
    *init() {

      let server = createAppServer(app, options);

      yield spawn(function*() {
        let error: Error = yield once(server, 'error');
        throw error;
      });

      server.listen(options.port);

      yield spawn(function*() {
        try {
          yield;
        } finally {
          let { future, resolve, reject } = createFuture<void>();
          server.close((err) => err ? reject(err) : resolve());
          yield future;
        }
      });

      if (!server.listening) {
        yield once(server, 'listening');
      }

      let address = server.address() as AddressInfo;

      yield label({ port: address.port });

      return {
        http: server,
        address
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

export interface Middleware {
  (req: Request, res: Response): Operation<void>
}

export interface HttpApp {
  handlers: RouteHandler[];
  middleware: (Middleware | RequestHandler)[];
  get(path: string, handler: HttpHandler): HttpApp;
  put(path: string, handler: HttpHandler): HttpApp;
  post(path: string, handler: HttpHandler): HttpApp;
  use(middleware: Middleware | RequestHandler): HttpApp;
}

export function createHttpApp(handlers: RouteHandler[] = [], middleware: (Middleware | RequestHandler)[] = []): HttpApp {
  function appendHandler(routeHandler: RouteHandler) {
    return createHttpApp(handlers.concat(routeHandler), middleware);
  }

  function appendMiddleware(middlewareHandler: Middleware | RequestHandler) {
    return createHttpApp(handlers, middleware.concat(middlewareHandler));
  }

  return {
    handlers,
    middleware: middleware,
    get: (path, handler) => appendHandler({ path, handler, method: 'get' }),
    post: (path, handler) => appendHandler({ path, handler, method: 'post' }),
    put: (path, handler) => appendHandler({ path, handler, method: 'put' }),
    use: (middlewareHandler) => appendMiddleware(middlewareHandler),
  };
}
