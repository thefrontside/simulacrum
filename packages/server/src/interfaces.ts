import type { Operation } from 'effection';
import type { Slice } from '@effection/atom';
import type { HttpApp } from './http';
import type { Faker } from './faker';

export type Services = Record<string, Service>;

export type Scenarios = Record<string, Scenario>;

export type Effects = (slice: Slice<SimulationState>, faker: Faker) => Operation<void>;

export interface Behaviors {
  services: Record<string, Service>;
  scenarios: Record<string, Scenario>;
  effects?: Effects;
}

export type Params = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Scenario<T = any, P extends Params = Params> {
  (store: Store, faker: Faker, params: P): Operation<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Simulator<Options = any> {
  (state: Slice<SimulationState>, options: Options): Behaviors;
}

export interface ServerOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  simulators: Record<string, Simulator<any>>;
  port?: number;
  seed?: number;
}

export interface Service {
  protocol: 'http' | 'https';
  app: HttpApp;
  port?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreState = Record<string, Record<string, Record<string, any>>>;

export type Store = Slice<StoreState>;

export interface ServerState {
  simulations: Record<string, SimulationState>;
}

export interface SimulationOptions {
  options?: Record<string, unknown>;
  services?: Record<string, {
    port?: number
  }>
}

export interface ServiceState {
  name: string;
  url: string;
}

export type SimulationState =
  {
    id: string;
    status: 'new',
    simulator: string,
    options: SimulationOptions;
    scenarios: Record<string, ScenarioState>;
    services: Record<string, ServiceState>;
    store: StoreState;
  } |
  {
    id: string,
    status: 'running',
    simulator: string,
    options: SimulationOptions;
    services: Record<string, ServiceState>;
    scenarios: Record<string, ScenarioState>;
    store: StoreState;
  } |
  {
    id: string,
    status: 'failed',
    simulator: string,
    options: SimulationOptions;
    scenarios: Record<string, ScenarioState>;
    services: Record<string, ServiceState>;
    store: StoreState;
    error: Error
  }

export type ScenarioState =
  {
    id: string;
    name: string;
    status: 'new';
    params: Params
  } |
  {
    id: string;
    name: string;
    status: 'running';
    params: Params;
  } |
  {
    id: string;
    name: string;
    status: "failed";
    params: Params;
    error: Error;
  }

export type SimulationStatus = SimulationState['status'];

export interface Server {
  port: number;
}
