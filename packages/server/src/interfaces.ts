import { Operation, Task } from 'effection';
import type { Request, Response } from 'express';

export interface Runnable<T> {
  run(scope: Task): T;
}

export interface Behaviors {
  https(handler: (app: HttpApp) => HttpApp, name?: string): Behaviors;
  http(handler: (app: HttpApp) => HttpApp, name?: string): Behaviors;
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

export interface ServerState {
  simulations: Record<string, SimulationState>;
}

export type SimulationState =
  {
    id: string;
    status: 'new',
    simulators: string[]
  } |
  {
    id: string,
    status: 'running',
    simulators: string[],
    services: {
      name: string;
      url: string;
    }[] }|
  {
    id: string,
    status: 'failed',
    simulators: string[],
    error: Error
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
