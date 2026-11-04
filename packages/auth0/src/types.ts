import { z } from "zod";

// An Action bound to a trigger, as Auth0 runs them: CommonJS source exporting `onExecutePostLogin`.
// https://auth0.com/docs/customize/actions/explore-triggers/post-login
export const actionSchema = z
  .strictObject({
    name: z.string().optional(),
    file: z.string().optional(),
    code: z.string().optional(),
    secrets: z.record(z.string(), z.string()).optional(),
  })
  .refine((action) => (action.file === undefined) !== (action.code === undefined), {
    message: "an action needs either `file` or `code`",
  });

export type ActionConfig = z.infer<typeof actionSchema>;

// grant_type list as defined by auth0
// https://auth0.com/docs/get-started/applications/application-grant-types#spec-conforming-grants
export type GrantType =
  | "password"
  | "client_credentials"
  | "authorization_code"
  | "refresh_token"
  | "http://auth0.com/oauth/grant-type/passwordless/otp";

export type ScopeConfig =
  | string
  | { audience?: string | undefined; clientID: string; scope: string }[];

export interface Auth0Configuration {
  port: number;
  audience: string;
  clientID: string;
  scope: ScopeConfig;
  domain?: string | undefined;
  clientSecret?: string | undefined;
  rulesDirectory?: string | undefined;
  actions?: ActionConfig[] | undefined;
  connection?: string | undefined;
  protocol?: "http" | "https" | undefined;
}

export type ResponseModes = "query" | "web_message";

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

export interface RefreshToken {
  iat: number;
  exp: number;
  rotations?: number;
  scope: string;
  sessionUid?: string;
  user: { id: string };
  nonce?: string | undefined;
}
