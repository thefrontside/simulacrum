import { assert } from "assert-ts";
import { SignJWT } from "jose";
import { KEY_ID, signingKey } from "../auth/constants.ts";
import { epochTime } from "../auth/date.ts";
import {
  createUserQuery,
  decodeAuthorizationCode,
  decodeRefreshToken,
  encodeRefreshToken,
  scopeIncludes,
  verifyPkce,
} from "./utils.ts";
import type { ExtendedSimulationStore } from "../store/index.ts";
import type { EntraUser } from "../store/entities.ts";
import type {
  AccessTokenClaims,
  EntraConfiguration,
  GrantType,
  IdTokenClaims,
  RefreshTokenPayload,
  TokenResponse,
} from "../types.ts";

const EXPIRES_IN_SECONDS = 3600;

const header = { alg: "RS256", typ: "JWT", kid: KEY_ID };

const sign = (claims: Record<string, unknown>): Promise<string> =>
  new SignJWT(claims).setProtectedHeader(header).sign(signingKey);

interface TokenContext {
  simulationStore: ExtendedSimulationStore;
  config: EntraConfiguration;
  issuer: string;
  tenant: string;
  body: Record<string, string | undefined>;
}

export const createTokens = async (ctx: TokenContext): Promise<TokenResponse> => {
  let grantType = (ctx.body.grant_type ?? "authorization_code") as GrantType;

  switch (grantType) {
    case "client_credentials":
      return clientCredentialsTokens(ctx);
    case "refresh_token":
      return refreshTokenTokens(ctx);
    case "authorization_code":
      return authorizationCodeTokens(ctx);
    case "password":
      return passwordTokens(ctx);
    default:
      assert(false, `400::unsupported grant_type ${grantType}`);
  }
};

const resolveClientId = (ctx: TokenContext): string => ctx.body.client_id ?? ctx.config.clientId;

const resolveAudience = (ctx: TokenContext, clientId: string): string => {
  // Entra scopes look like `api://<resource>/<scope>` or `<resource>/.default`.
  // The access token audience is the resource. When the caller passes a
  // `resource` we honor it; otherwise the audience is the client itself
  // (id-token-style), which is what SPAs calling their own API expect.
  if (ctx.body.resource) return ctx.body.resource;
  return clientId;
};

const buildIdToken = async ({
  ctx,
  user,
  clientId,
  nonce,
  authTime,
}: {
  ctx: TokenContext;
  user: EntraUser;
  clientId: string;
  nonce: string | undefined;
  authTime: number;
}): Promise<string> => {
  let iat = epochTime();
  let claims: IdTokenClaims = {
    ver: "2.0",
    iss: ctx.issuer,
    sub: user.id,
    aud: clientId,
    exp: iat + EXPIRES_IN_SECONDS,
    iat,
    nbf: iat,
    name: user.name,
    preferred_username: user.preferredUsername,
    email: user.email,
    oid: user.id,
    tid: ctx.tenant,
    auth_time: authTime,
  };
  if (typeof nonce !== "undefined") {
    claims.nonce = nonce;
  }
  return sign(claims);
};

const buildAccessToken = async ({
  ctx,
  user,
  clientId,
  scope,
}: {
  ctx: TokenContext;
  user: EntraUser;
  clientId: string;
  scope: string;
}): Promise<string> => {
  let iat = epochTime();
  let audience = resolveAudience(ctx, clientId);
  // Entra strips the reserved OIDC scopes from the `scp` claim on access tokens.
  let scp = scope
    .split(" ")
    .filter((s) => s && !["openid", "profile", "offline_access"].includes(s))
    .join(" ");

  let claims: AccessTokenClaims = {
    ver: "2.0",
    iss: ctx.issuer,
    sub: user.id,
    aud: audience,
    exp: iat + EXPIRES_IN_SECONDS,
    iat,
    nbf: iat,
    oid: user.id,
    tid: ctx.tenant,
    azp: clientId,
    scp,
    name: user.name,
    preferred_username: user.preferredUsername,
  };
  return sign(claims);
};

const buildRefreshToken = (payload: Omit<RefreshTokenPayload, "iat" | "exp">): string => {
  let iat = epochTime();
  return encodeRefreshToken({
    ...payload,
    iat,
    // 90 day sliding window, as Entra defaults to
    exp: iat + 90 * 24 * 60 * 60,
  });
};

const tokenResponse = ({
  accessToken,
  idToken,
  refreshToken,
  scope,
}: {
  accessToken: string;
  idToken?: string | undefined;
  refreshToken?: string | undefined;
  scope: string;
}): TokenResponse => ({
  token_type: "Bearer",
  scope,
  expires_in: EXPIRES_IN_SECONDS,
  ext_expires_in: EXPIRES_IN_SECONDS,
  access_token: accessToken,
  ...(idToken ? { id_token: idToken } : {}),
  ...(refreshToken ? { refresh_token: refreshToken } : {}),
});

const findUserById = (ctx: TokenContext, id: string): EntraUser => {
  let user = createUserQuery(ctx.simulationStore)((u) => u.id === id);
  assert(!!user, "401::invalid_grant");
  return user;
};

const authorizationCodeTokens = async (ctx: TokenContext): Promise<TokenResponse> => {
  let { code, code_verifier } = ctx.body;
  assert(typeof code !== "undefined", "400::no code in token request");

  let decoded = decodeAuthorizationCode(code);

  assert(
    verifyPkce({
      codeVerifier: code_verifier,
      codeChallenge: decoded.code_challenge,
      codeChallengeMethod: decoded.code_challenge_method,
    }),
    "400::invalid_grant: PKCE verification failed",
  );

  let clientId = ctx.body.client_id ?? decoded.client_id;
  let user = findUserById(ctx, decoded.sub);
  let scope = ctx.body.scope ?? decoded.scope;

  return finishUserTokens({
    ctx,
    user,
    clientId,
    scope,
    nonce: decoded.nonce,
    authTime: decoded.auth_time,
  });
};

const refreshTokenTokens = async (ctx: TokenContext): Promise<TokenResponse> => {
  let { refresh_token } = ctx.body;
  assert(typeof refresh_token !== "undefined", "400::no refresh_token in token request");

  let decoded = decodeRefreshToken(refresh_token);
  let clientId = ctx.body.client_id ?? decoded.client_id;
  let user = findUserById(ctx, decoded.sub);
  let scope = ctx.body.scope ?? decoded.scope;

  return finishUserTokens({
    ctx,
    user,
    clientId,
    scope,
    nonce: decoded.nonce,
    // preserve the original sign-in time across the refresh (real Entra behavior)
    authTime: decoded.auth_time,
  });
};

const passwordTokens = async (ctx: TokenContext): Promise<TokenResponse> => {
  // ROPC grant. Not recommended by Microsoft, but supported by Entra and handy
  // for non-interactive integration tests.
  let { username, password } = ctx.body;
  assert(!!username, "400::username is required");

  let user = createUserQuery(ctx.simulationStore)(
    (u) =>
      u.email?.toLowerCase() === username!.toLowerCase() ||
      u.preferredUsername?.toLowerCase() === username!.toLowerCase(),
  );
  assert(!!user, "401::invalid_grant");
  assert(user.password === password, "401::invalid_grant");

  let clientId = resolveClientId(ctx);
  let scope = ctx.body.scope ?? ctx.config.scope;
  return finishUserTokens({ ctx, user, clientId, scope, nonce: undefined, authTime: epochTime() });
};

const finishUserTokens = async ({
  ctx,
  user,
  clientId,
  scope,
  nonce,
  authTime,
}: {
  ctx: TokenContext;
  user: EntraUser;
  clientId: string;
  scope: string;
  nonce: string | undefined;
  authTime: number;
}): Promise<TokenResponse> => {
  let accessToken = await buildAccessToken({ ctx, user, clientId, scope });

  let idToken = scopeIncludes(scope, "openid")
    ? await buildIdToken({ ctx, user, clientId, nonce, authTime })
    : undefined;

  let refreshToken = scopeIncludes(scope, "offline_access")
    ? buildRefreshToken({
        sub: user.id,
        oid: user.id,
        nonce,
        scope,
        client_id: clientId,
        auth_time: authTime,
      })
    : undefined;

  return tokenResponse({ accessToken, idToken, refreshToken, scope });
};

const clientCredentialsTokens = async (ctx: TokenContext): Promise<TokenResponse> => {
  let clientId = resolveClientId(ctx);
  let audience = ctx.body.resource ?? ctx.config.audience;
  let iat = epochTime();

  // In the client_credentials flow there is no user; the subject is the app's
  // service principal. Entra emits `roles` (app roles) rather than `scp`.
  let claims: AccessTokenClaims = {
    ver: "2.0",
    iss: ctx.issuer,
    sub: clientId,
    aud: audience,
    exp: iat + EXPIRES_IN_SECONDS,
    iat,
    nbf: iat,
    oid: clientId,
    tid: ctx.tenant,
    azp: clientId,
    roles: [],
  };

  let accessToken = await sign(claims);

  return {
    token_type: "Bearer",
    expires_in: EXPIRES_IN_SECONDS,
    ext_expires_in: EXPIRES_IN_SECONDS,
    access_token: accessToken,
  };
};
