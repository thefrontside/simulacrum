import { z } from "zod";

export const configurationSchema = z.object({
  port: z.optional(
    z.number().gt(2999, "port must be greater than 2999").lt(10000, "must be less than 10000"),
  ),
  // The default tenant used when constructing the bin/example issuer. Requests
  // may target any tenant in the path; whatever tenant is used becomes the
  // `tid` claim and the issuer tenant so tokens stay internally consistent.
  tenant: z.optional(z.string().min(1, "tenant is required")),
  // Entra application (client) id. GUID in real Entra, but any string works here.
  clientId: z.optional(z.string().min(1, "clientId is required")),
  // Default audience for access tokens when a request does not specify a resource.
  audience: z.optional(z.string().min(1, "audience is required")),
  // Space delimited scopes the simulator advertises/echoes by default.
  scope: z.optional(z.string().min(1, "scope is required")),
  cookieSecret: z.optional(z.string()),
});

export type ConfigSchema = z.infer<typeof configurationSchema>;

type ReadonlyFields = "tenant" | "clientId" | "audience" | "scope" | "port";

export type EntraConfiguration = {
  [K in ReadonlyFields]-?: NonNullable<ConfigSchema[K]>;
} & Omit<ConfigSchema, ReadonlyFields>;

// grant types Entra's v2.0 token endpoint accepts that we simulate
export type GrantType = "authorization_code" | "refresh_token" | "client_credentials" | "password";

export type ResponseMode = "query" | "fragment" | "form_post";

export type AuthorizeQuery = {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  response_mode?: ResponseMode | undefined;
  scope: string;
  state?: string | undefined;
  nonce?: string | undefined;
  code_challenge?: string | undefined;
  code_challenge_method?: string | undefined;
  prompt?: string | undefined;
  login_hint?: string | undefined;
  domain_hint?: string | undefined;
};

// Payload we encode into an authorization code so the token endpoint is stateless.
export interface AuthorizationCode {
  sub: string;
  oid: string;
  nonce?: string | undefined;
  scope: string;
  client_id: string;
  code_challenge?: string | undefined;
  code_challenge_method?: string | undefined;
  auth_time: number;
  iat: number;
}

export interface RefreshTokenPayload {
  sub: string;
  oid: string;
  nonce?: string | undefined;
  scope: string;
  client_id: string;
  iat: number;
  exp: number;
}

export interface IdTokenClaims {
  ver: "2.0";
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nbf: number;
  name?: string | undefined;
  preferred_username?: string | undefined;
  oid: string;
  tid: string;
  email?: string | undefined;
  nonce?: string | undefined;
  auth_time?: number | undefined;
  [key: string]: unknown;
}

export interface AccessTokenClaims {
  ver: "2.0";
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nbf: number;
  oid: string;
  tid: string;
  azp: string;
  scp?: string | undefined;
  roles?: string[] | undefined;
  name?: string | undefined;
  preferred_username?: string | undefined;
  [key: string]: unknown;
}

export interface TokenResponse {
  token_type: "Bearer";
  scope?: string | undefined;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
  refresh_token?: string | undefined;
  id_token?: string | undefined;
}
