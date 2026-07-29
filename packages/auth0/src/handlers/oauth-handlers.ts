import { assert } from "assert-ts";
import { decode, decode as decodeBase64 } from "base64-url";
import { epochTime, expiresAt } from "../auth/date.ts";
import { signingKey, JWKS } from "../auth/constants.ts";
import { SignJWT } from "jose";
import { createRulesRunner } from "../rules/rules-runner.ts";
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
import { type Auth0User } from "../store/entities.ts";

export const createTokens = async ({
  body,
  iss,
  clientID,
  audience,
  rulesDirectory,
  scope: scopeConfig,
  simulationStore,
}: {
  body: Request["body"];
  iss: string;
  clientID: string;
  audience: string;
  rulesDirectory: string | undefined;
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

  return {
    access_token: await new SignJWT({
      ...accessToken,
      ...context.accessToken,
      ...(scope.split(" ").includes("email") ? { email: user.email } : {}),
    })
      .setProtectedHeader({ alg: "RS256", kid: JWKS.keys[0].kid })
      .setIssuedAt()
      .setExpirationTime(`${expiresInHours}h`)
      .sign(signingKey),
    id_token: await new SignJWT({ ...userData, ...context.idToken })
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
    email_verified: true,
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
