import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { Client, Simulation } from '@simulacrum/client';

export type TestState = Record<string, {
  client: Client;
  simulation?: Simulation;
  person?: Person
}>;

export type CreateSimulation = Auth0ClientOptions & { debug?: boolean };

export interface Token {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access_token: Record<string, any>;
  expires_in: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id_token: Record<string, any>
}

export interface Person { email: string; password: string }

export type GetClientFromSpec = (spec: string) => Client;
