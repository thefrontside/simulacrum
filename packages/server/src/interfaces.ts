import type { Operation, Resource } from 'effection';
import type { Slice } from '@effection/atom';
import type { HttpApp } from './http';
import type { Faker } from './faker';
import type { Service, SimulationOptions } from '@simulacrum/types';

export interface Behaviors<O> {
  services: Record<string, ServiceCreator<O>>;
  scenarios: Record<string, Scenario>;
  effects?: () => Operation<void>;
}

export type Params = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Scenario<T = any, P extends Params = Params> {
  (store: Store, faker: Faker, params: P): Operation<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Simulator<Options> {
  (state: Slice<SimulationState<Options>>, options: Options): Behaviors<Options>;
}

export interface ServerOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  simulators: Record<string, Simulator<any>>;
  port?: number;
  seed?: number;
  debug?: boolean;
}

export interface LegacyServiceCreator {
  protocol: 'http' | 'https';
  app: HttpApp;
  port?: number;
}

export type ResourceServiceCreator<O> = (slice: Slice<SimulationState<O>>, options: Service) => Resource<Service>;

export type ServiceCreator<O> = ResourceServiceCreator<O> | LegacyServiceCreator;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreState = Record<string, Record<string, Record<string, any>>>;

export type Store = Slice<StoreState>;

export interface ServerState<O = unknown> {
  debug: boolean;
  simulations: Record<string, SimulationState<O>>;
}

export type SimulationState<O = unknown> =
  {
    id: string;
    status: 'new';
    debug?: boolean;
    simulator: string;
    options: SimulationOptions<O>;
    scenarios: Record<string, ScenarioState>;
    services: [];
    store: StoreState;
  } |
  {
    id: string,
    status: 'running';
    simulator: string;
    debug?: boolean;
    options: SimulationOptions<O>;
    services: {
      name: string;
      url: string;
    }[];
    scenarios: Record<string, ScenarioState>;
    store: StoreState;
  } |
  {
    id: string,
    status: 'failed';
    simulator: string;
    debug?: boolean;
    options: SimulationOptions<O>;
    scenarios: Record<string, ScenarioState>;
    services: [];
    store: StoreState;
    error: Error
  } |
  {
    id: string;
    status: 'destroying';
    simulator: string;
    debug?: boolean;
    options: SimulationOptions<O>;
    scenarios: Record<string, ScenarioState>;
    services: [];
    store: StoreState;
    error: Error;
  } |
  {
    id: string;
    status: 'halted';
    simulator: string;
    debug?: boolean;
    options: SimulationOptions<O>;
    scenarios: Record<string, ScenarioState>;
    services: [];
    store: StoreState;
    error: Error;
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

export type SimulationStatus = SimulationState<unknown>['status'];

export interface Server {
  port: number;
}
