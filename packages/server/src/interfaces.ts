import { Operation } from 'effection';
import { Slice } from '@effection/atom';
import type { HttpApp } from './http';
import type { Faker } from './faker';

export interface Behaviors {
  services: Record<string, Service>;
  scenarios: Record<string, Scenario>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Scenario<T = any> {
  (store: Store, faker: Faker): Operation<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Simulator<Options = any> {
  (options: Options): Behaviors;
}

export interface ServerOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  simulators: Record<string, Simulator<any>>;
  port?: number;
  seed?: number;
}

export interface Service {
  protocol: 'http' | 'https',
  app: HttpApp
}

export type StoreState = Record<string, Record<string, Record<string, unknown>>>;
export type Store = Slice<StoreState>;

export interface ServerState {
  simulations: Record<string, SimulationState>;
}

export type SimulationState =
  {
    id: string;
    status: 'new',
    simulator: string,
    options: Record<string, unknown>;
    scenarios: Record<string, ScenarioState>;
    store: StoreState;
  } |
  {
    id: string,
    status: 'running',
    simulator: string,
    options: Record<string, unknown>;
    services: {
      name: string;
      url: string;
    }[];
    scenarios: Record<string, ScenarioState>;
    store: StoreState;
  } |
  {
    id: string,
    status: 'failed',
    simulator: string,
    options: Record<string, unknown>;
    scenarios: Record<string, ScenarioState>;
    store: StoreState;
    error: Error
  }

export type ScenarioState =
  {
    id: string;
    name: string;
    status: 'new';
  } |
  {
    id: string;
    name: string;
    status: 'running';
  } |
  {
    id: string;
    name: string;
    status: "failed";
    error: Error;
  }

export interface Server {
  port: number;
}
