import { Operation } from 'effection';
import { IncomingMessage, ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { Express } from 'express';

export type HttpServers = HttpServer | HttpsServer | Express;

export interface Simulator {
  (simulation: Simulation): Simulation;
}

export interface ServerOptions {
  simulators: Record<string, Simulator>;
}

export type Protocols = 'http' | 'https';

export interface Simulation {
  id: string;
  https: (handler: (app: HttpApp) => HttpApp) => Simulation;
  http: (handler: (app: HttpApp) => HttpApp) => Simulation;
  simulators: Record<string, Simulator>;
  apps: Array<{
    protocol: Protocols,
    app: HttpApp
  }>; 
}

export interface Server {
  port: number;
}

export type HttpServerOptions = { onClose?: () => void };

export interface SimulationServer extends Server {
  availableSimulators: Record<string, Simulator>;
}

export interface HttpHandler {
  (request: IncomingMessage, response: ServerResponse): Operation<void>;
}

export const HttpMethods = ['get', 'post', 'put', 'delete', 'patch'] as const;

export type Methods = typeof HttpMethods[number];

export type RouteHandler = {
  method: Methods;
  path: string;
  handler: HttpHandler;
}

export type HttpApp = {
  [Method in Methods]: (path: string, handler: HttpHandler) => HttpApp;
} & {
  handlers: RouteHandler[];
}