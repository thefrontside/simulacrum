import { z } from "zod";

export interface ConfigFieldDef {
  schema: z.ZodType;
  description: string;
  default?: string | number;
  aliases?: string[];
}

export const configFields = {
  port: {
    schema: z.optional(
      z.number().gt(2999, "port must be greater than 2999").lt(10000, "must be less than 10000"),
    ),
    description: "port to listen on",
    default: 4400 as const,
    aliases: ["-p"],
  },
  domain: {
    schema: z.optional(z.string().min(1, "domain is required")),
    description: "server domain",
  },
  audience: {
    schema: z.optional(z.string().min(1, "audience is required")),
    description: "auth0 audience",
    default: "https://thefrontside.auth0.com/api/v1/" as const,
  },
  clientId: {
    schema: z.optional(z.string().max(32, "must be 32 characters long")),
    description: "auth0 client ID",
    default: "00000000000000000000000000000000" as const,
  },
  clientSecret: {
    schema: z.optional(z.string()),
    description: "client secret",
  },
  scope: {
    schema: z.union([
      z.string().min(1, "scope is required"),
      z.array(
        z.object({
          clientId: z.string().max(32, "must be 32 characters long"),
          audience: z.optional(z.string().min(1, "audience is required")),
          scope: z.string().min(1, "scope is required"),
        }),
      ),
    ]),
    description: "auth0 scope",
    default: "openid profile email offline_access" as const,
  },
  rulesDirectory: {
    schema: z.optional(z.string()),
    description: "directory containing auth0 rules",
  },
  connection: {
    schema: z.optional(z.string()),
    description: "auth0 connection",
  },
  protocol: {
    schema: z.optional(z.enum(["http", "https"])),
    description: "server protocol",
    default: "https",
  },
} satisfies Record<string, ConfigFieldDef>;

export const configurationSchema = z.object({
  port: configFields.port.schema,
  domain: configFields.domain.schema,
  audience: configFields.audience.schema,
  clientId: configFields.clientId.schema,
  clientSecret: configFields.clientSecret.schema,
  scope: configFields.scope.schema,
  rulesDirectory: configFields.rulesDirectory.schema,
  connection: configFields.connection.schema,
  protocol: configFields.protocol.schema,
});

export type ConfigSchema = z.infer<typeof configurationSchema>;

type ReadonlyFields = "audience" | "clientId" | "scope" | "port";

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
  | { audience?: string | undefined; clientId: string; scope: string }[];

export type Auth0Configuration = Required<Pick<ConfigSchema, ReadonlyFields>> &
  Omit<ConfigSchema, ReadonlyFields>;
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

type Token<P> = {
  payload: P;
};

export type IdToken = Token<IdTokenData>;

export type AccessToken = Token<AccessTokenPayload>;
