import { Task } from 'effection';
import type { HttpApp } from './http';

export interface Runnable<T> {
  run(scope: Task): T;
}

export interface Behaviors {
  services: Record<string, Service>;
}

export interface Simulator {
  (): Behaviors;
}

export interface ServerOptions {
  simulators: Record<string, Simulator>;
  port?: number;
}

export interface Service {
  protocol: 'http' | 'https',
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
