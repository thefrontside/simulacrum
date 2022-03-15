import type { SimulationState, Store } from '@simulacrum/server';
import type { Slice } from '@effection/atom';

export interface Options {
  scope: string;
  port?: number;
  audience: string;
  clientID: string;
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

export interface TokenSet {
  access_token?: string;
  token_type?: string;
  id_token?: string;
  refresh_token?: string;
  scope?: string;

  expires_at?: number;
  session_state?: string;

  [key: string]: unknown;
}

export interface IdTokenData {
  alg: string;
  typ: string;
  iss: string;
  exp: number;
  iat: number;
  email: string;
  aud: string;
  sub: string;
  nonce?: string;
}

export interface AccessTokenPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  scope: string;

  [key: string]: string | number | string[];
}

export interface IdToken {
  payload: IdTokenData;
}

export interface AccessToken {
  payload: AccessTokenPayload;
}
