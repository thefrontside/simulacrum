import type { ServerOptions as SSLOptions, Server as HTTPSServer } from 'https';
import type { AddressInfo } from 'net';
import type { Service } from './interfaces';
import { Operation, once, Resource, spawn } from 'effection';
import { Request, Response, Application, RequestHandler } from 'express';
import { createServer as createHttpsServer } from 'https';
import { Server as HTTPServer, createServer as createHttpServer } from 'http';
import { paths } from './config/paths';
import fs from 'fs';
import { mkcertText, NoSSLError } from './errors/ssl/ssl-error';

export interface Server {
  http: HTTPServer;
  address: AddressInfo;
}

export interface ServerOptions {
  port?: number;
  protocol: Service['protocol'];
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
    default:
      throw new Error(`no server for optin ${options.protocol}`);
  }
};

export function createServer(app: Application, options: ServerOptions): Resource<Server> {
  return {
    *init() {

      let server: HTTPServer | HTTPSServer;

      try {
        server = createAppServer(app, options);
      } catch (err) {
        console.dir(err);

        if(err.code === 'EADDRINUSE') {
          console.warn(`port ${options.port} in use, ignoring`);
          return;
        }

        throw err;
      }


      yield spawn(function*() {
        let error: Error = yield once(server, 'error');

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
