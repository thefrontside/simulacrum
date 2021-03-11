import { Operation } from 'effection';
import { IncomingMessage, ServerResponse } from 'http';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import type { Express } from 'express';

export type AvailableServers = HttpServer | HttpsServer | Express;

export interface Server {
  port: number;
}

export interface ServerOptions {
  simulators: Record<string, Simulator>;
}

export interface Simulator {
  (simulation: Simulation): Simulation;
}

export interface Simulation {
  id: string;
  http: (handler: (app: HttpApp) => HttpApp) => Simulation;
}

export interface HttpHandler {
  (request: IncomingMessage, response: ServerResponse): Operation<void>;
}

export interface HttpApp {
  get(path: string, handler: HttpHandler): HttpApp;
  post(path: string, handler: HttpHandler): HttpApp;
}