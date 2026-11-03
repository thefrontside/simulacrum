import { assert } from "assert-ts";
import { decode, decode as decodeBase64 } from "base64-url";
import { epochTime, expiresAt } from "../auth/date.ts";
import { signingKey, JWKS } from "../auth/constants.ts";
import { SignJWT } from "jose";
import { createRulesRunner } from "../rules/rules-runner.ts";
import type { ActionsRunner, PostLoginEvent } from "../actions/actions-runner.ts";
import { deriveScope, createPersonQuery } from "./utils.ts";

import type { Request } from "express";
import type { RuleContext, RuleUser } from "../rules/types.ts";
import type {
  ScopeConfig,
  AccessTokenPayload,
  GrantType,
  IdTokenData,
  RefreshToken,
} from "../types.ts";
import { createRefreshToken, issueRefreshToken } from "../auth/refresh-token.ts";
import { type ExtendedSimulationStore } from "../store/index.ts";
import { identitiesOf, mergeMetadata, type Auth0User } from "../store/entities.ts";

export const createTokens = async ({
  body,
  iss,
  clientID,
  audience,
  rulesDirectory,
  actionsRunner,
  request,
  scope: scopeConfig,
  simulationStore,
}: {
  body: Request["body"];
  iss: string;
  clientID: string;
  audience: string;
  rulesDirectory: string | undefined;
  actionsRunner: ActionsRunner;
  request: PostLoginEvent["request"];
  scope: ScopeConfig;
  simulationStore: ExtendedSimulationStore;
}) => {
  let { grant_type }: { grant_type: GrantType } = body;
  let scope = deriveScope({ scopeConfig, clientID, audience });
  const expiresInHours = 24;

  let accessToken = getBaseAccessToken({ iss, grant_type, scope, audience, expiresInHours });
  let user: Auth0User | undefined;
  let nonce: string | undefined;

  if (grant_type === "client_credentials") {
    return {
      access_token: await new SignJWT({
        ...accessToken,
        // see https://community.auth0.com/t/sub-claim-format-for-m2m-tokens/39451
        sub: `${body.client_id ?? clientID}@clients`,
        // see https://community.auth0.com/t/difference-between-scopes-and-permissions-in-access-token/28900
        gty: "client-credentials",
      })
        .setProtectedHeader({ alg: "RS256", kid: JWKS.keys[0].kid })
        .setIssuedAt()
        .setIssuer(iss)
        .setAudience(audience)
        .setExpirationTime(`${expiresInHours}h`)
        .sign(signingKey),
      expires_in: expiresAt(expiresInHours),
    };
  }
  // TODO: check refresh_token expiry date
  else if (grant_type === "refresh_token") {
    let { refresh_token: refreshTokenValue } = body;
    let refreshToken: RefreshToken = JSON.parse(decode(refreshTokenValue));

    let findUser = createPersonQuery(simulationStore);

    user = findUser((person) => person.id === refreshToken.user.id);

    nonce = refreshToken.nonce;
    assert(!!nonce, `400::No nonce in request`);
  } else {
    let result = verifyUserExistsInStore({
      simulationStore,
      body,
      grant_type,
    });

    user = result.user;
    nonce = result.nonce;

    let authorizeQuery =
      nonce &&
      simulationStore.schema.sessions.selectById(simulationStore.store.getState(), { id: nonce })
        ?.authorizeQuery;
    if (authorizeQuery) request = { ...request, query: authorizeQuery };
  }

  assert(!!user, "500::No user found");

  let { idTokenData, userData } = getIdToken({
    body,
    iss,
    user,
    clientID,
    nonce,
    expiresInHours,
  });

  let context: RuleContext<Partial<AccessTokenPayload>, IdTokenData> = {
    clientID,
    accessToken: { scope, sub: idTokenData.sub },
    idToken: idTokenData,
  };

  let rulesRunner = createRulesRunner(rulesDirectory);
  // the rules mutate the values
  await rulesRunner(userData, context);

  // Auth0 runs Actions after Rules, on login and on refresh token exchange
  let actions = await runPostLoginActions({
    actionsRunner,
    simulationStore,
    user,
    grant_type,
    connection: connectionOf(grant_type, body),
    request,
    clientID,
    audience,
    scope,
  });

  return {
    access_token: await new SignJWT({
      ...accessToken,
      ...context.accessToken,
      ...(scope.split(" ").includes("email") ? { email: user.email } : {}),
      ...actions.accessTokenClaims,
    })
      .setProtectedHeader({ alg: "RS256", kid: JWKS.keys[0].kid })
      .setIssuedAt()
      .setExpirationTime(`${expiresInHours}h`)
      .sign(signingKey),
    id_token: await new SignJWT({ ...userData, ...context.idToken, ...actions.idTokenClaims })
      .setProtectedHeader({ alg: "RS256", kid: JWKS.keys[0].kid })
      .setIssuedAt()
      .setExpirationTime(`${expiresInHours}h`)
      .sign(signingKey),
    refresh_token: issueRefreshToken(scope, grant_type)
      ? createRefreshToken({
          exp: idTokenData.exp,
          rotations: 0,
          scope,
          user,
          nonce,
        })
      : undefined,
    expires_in: expiresAt(expiresInHours),
  };
};

export class AccessDeniedError extends Error {}

// event.transaction.protocol as Auth0 reports it for each grant
const protocolOf = (grant_type: GrantType) =>
  ({
    password: "oauth2-resource-owner",
    refresh_token: "oauth2-refresh-token",
  })[grant_type as string] ?? "oidc-basic-profile";

// a passwordless login goes through the email or sms connection its realm names
const connectionOf = (
  grant_type: GrantType,
  body: Request["body"],
): PostLoginEvent["connection"] => {
  if (grant_type !== "http://auth0.com/oauth/grant-type/passwordless/otp") {
    return { name: body.connection ?? "Username-Password-Authentication", strategy: "auth0" };
  }
  let name = body.realm === "sms" ? "sms" : "email";
  return { name, strategy: name };
};

const runPostLoginActions = async ({
  actionsRunner,
  simulationStore,
  user,
  grant_type,
  connection,
  request,
  clientID,
  audience,
  scope,
}: {
  actionsRunner: ActionsRunner;
  simulationStore: ExtendedSimulationStore;
  user: Auth0User;
  grant_type: GrantType;
  connection: PostLoginEvent["connection"];
  request: PostLoginEvent["request"];
  clientID: string;
  audience: string;
  scope: string;
}) => {
  // a refresh token exchange runs the actions but isn't a login
  let logins = grant_type === "refresh_token" ? 0 : 1;

  // counted before the actions run, so that overlapping logins each see their own count, and the
  // user read back as it is now, since the store may have changed while the rules ran. The update
  // is synchronous, so nothing comes between the two.
  let { schema, store, actions } = simulationStore;
  store.dispatch(
    actions.batchUpdater([
      (state) => {
        let current = schema.users.selectById(state, { id: user.id });
        if (!current) return;
        schema.users.patch({ [user.id]: { logins_count: current.logins_count + logins } })(state);
      },
    ]),
  );
  user = schema.users.selectById(store.getState(), { id: user.id }) ?? {
    ...user,
    logins_count: user.logins_count + logins,
  };

  let result = await actionsRunner.postLogin({
    user: {
      user_id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      picture: user.picture,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
      identities: identitiesOf(user, connection),
    },
    request,
    stats: { logins_count: user.logins_count },
    client: { client_id: clientID },
    authorization: { roles: [] },
    resource_server: { identifier: audience },
    connection,
    transaction: { protocol: protocolOf(grant_type), requested_scopes: scope.split(" ") },
  });

  // applied to the user as it is now, which overlapping logins or the Management API may have changed
  store.dispatch(
    actions.batchUpdater([
      (state) => {
        let current = schema.users.selectById(state, { id: user.id });
        if (!current) return; // deleted while the actions ran
        schema.users.patch({
          [user.id]: {
            user_metadata: mergeMetadata(current.user_metadata, result.userMetadata),
            app_metadata: mergeMetadata(current.app_metadata, result.appMetadata),
          },
        })(state);
      },
    ]),
  );

  if (result.error !== undefined) throw result.error;
  if (result.denied !== undefined) throw new AccessDeniedError(result.denied);
  // a user deleted while the actions ran can't log in
  assert(!!schema.users.selectById(store.getState(), { id: user.id }), "401::Unauthorized");

  return result;
};

export const getIdToken = ({
  body,
  iss,
  user,
  clientID,
  nonce,
  expiresInHours,
}: {
  body: Request["body"];
  iss: string;
  user: Auth0User;
  clientID: string;
  nonce: string | undefined;
  expiresInHours: number;
}) => {
  let userData: RuleUser = {
    name: body?.name ?? user.name,
    email: body?.email ?? user.email,
    email_verified: user.email_verified,
    user_id: body?.id ?? user.id,
    nickname: body?.nickname,
    picture: body?.picture ?? user.picture,
    identities: body?.identities,
  };

  assert(!!user.email, "500::User in store requires an email");

  let idTokenData: IdTokenData = {
    alg: "RS256",
    typ: "JWT",
    iss,
    exp: expiresAt(expiresInHours ?? 24),
    iat: epochTime(),
    email: user.email,
    aud: clientID,
    sub: user.id,
  };

  if (typeof nonce !== "undefined") {
    idTokenData.nonce = nonce;
  }

  return { userData, idTokenData };
};

export const getBaseAccessToken = ({
  iss,
  grant_type,
  scope,
  audience,
  expiresInHours,
}: {
  iss: string;
  grant_type: string;
  scope: string;
  audience: string;
  expiresInHours: number;
}): Partial<AccessTokenPayload> => ({
  iss,
  exp: expiresAt(expiresInHours ?? 24),
  iat: epochTime(),
  aud: audience,
  gty: grant_type,
  scope,
});

const verifyUserExistsInStore = ({
  simulationStore,
  body,
  grant_type,
}: {
  simulationStore: ExtendedSimulationStore;
  body: Request["body"];
  grant_type: string;
}) => {
  let { code } = body;
  let personQuery = createPersonQuery(simulationStore);
  let nonce: string | undefined;
  let username: string | undefined;
  let password: string | undefined;

  if (grant_type === "http://auth0.com/oauth/grant-type/passwordless/otp") {
    username = body.username;
  } else if (grant_type === "password") {
    username = body.username;
    password = body.password;
  } else {
    // specifically grant_type === 'authorization_code'
    // but naively using it to handle other cases at the moment
    assert(typeof code !== "undefined", "400::no code in /oauth/token");
    [nonce, username] = decodeBase64(code).split(":");
    assert(!!username, `400::no nonce in store for ${code}`);
  }

  let user: Auth0User | undefined = personQuery((person) => {
    assert(!!person.email, `500::no email defined on person scenario`);

    let valid = !!username && person.email.toLowerCase() === username.toLowerCase();

    if (typeof password === "undefined") {
      return valid;
    } else {
      return valid && password === person.password;
    }
  });

  assert(!!user, "401::Unauthorized");

  return { user, nonce };
};
