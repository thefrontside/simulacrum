import type { SimulationState, Store } from '@simulacrum/server';
import type { Slice } from '@effection/atom';

export interface Options {
  scope: string;
  port?: number;
  audience: string;
  clientId?: string;
  store: Store;
  services: Slice<SimulationState['services']>;
  rulesDirectory?: string;
}

export type ResponseModes = 'query' | 'web_message';

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
