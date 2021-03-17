import { Operation, Task } from 'effection';
import type { Request, Response } from 'express';

export interface Runnable<T> {
  run(scope: Task): T;
}

export interface Behaviors {
  https: (handler: (app: HttpApp) => HttpApp) => Behaviors;
  http: (handler: (app: HttpApp) => HttpApp) => Behaviors;
  services: Service[];
}

export interface Simulator {
  (behavior: Behaviors): Behaviors;
}

export interface ServerOptions {
  simulators: Record<string, Simulator>;
  port?: number;
}

export type Protocols = 'http' | 'https';

export interface Service {
  name: string;
  protocol: Protocols,
  app: HttpApp
}

export interface Simulation {
  id: string;
  simulators: Record<string, Simulator>;
  services: Service[];
  addSimulator(name: string, simulator: Simulator): Simulation;
  scope: Task;
}

export interface Server {
  port: number;
}

export interface HttpHandler {
  (request: Request, response: Response): Operation<void>;
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
