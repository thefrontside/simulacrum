import type { ServerOptions as SSLOptions } from 'https';
import type { AddressInfo } from 'net';
import type { Service } from './interfaces';
import { Operation, once, Resource, spawn } from 'effection';
import { Request, Response, Application } from 'express';
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
