import { SimulationState, Store } from '@simulacrum/server';
import { Slice } from '@effection/atom';

export interface Options {
  scope: string;
  port?: number;
  audience: string;
  clientId?: string;
  store: Store;
  services: Slice<SimulationState['services']>;
}

export type ResponseModes = 'query' | 'web_message' | 'fragment';

export type QueryParams = {
  state: string;
  code: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  client_id: string;
  nonce: string;
  code_challenge_method: string;
  response_type: string;
  response_mode: ResponseModes;
  auth0Client: string;
  audience: string;
};
