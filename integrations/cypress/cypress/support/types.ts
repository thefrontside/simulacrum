import { AuthOptions } from 'auth0-js';
import { Client, Simulation } from '@simulacrum/client';

export type TestState = Record<string, {
  client: Client;
  simulation?: Simulation;
  person?: Person
}>;

export type CreateSimulation = Omit<AuthOptions, 'clientID'> & { debug?: boolean, client_id?: string };

export interface Token {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access_token: Record<string, any>;
  expires_in: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id_token: Record<string, any>
}

export interface Person { email: string; password: string }

export type GetClientFromSpec = (spec: string) => Client;
