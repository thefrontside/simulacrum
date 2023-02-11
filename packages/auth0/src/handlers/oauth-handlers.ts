import { assert } from 'assert-ts';
import { decode, decode as decodeBase64 } from 'base64-url';
import { epochTime, expiresAt } from '../auth/date';
import { createJsonWebToken } from '../auth/jwt';
import { createRulesRunner } from '../rules/rules-runner';
import { deriveScope, createPersonQuery } from './utils';

import type { Request } from 'express';
import type { Person } from '@simulacrum/server';
import type { RuleContext, RuleUser } from '../rules/types';
import type {
  ScopeConfig,
  AccessTokenPayload,
  GrantType,
  IdTokenData,
  RefreshToken,
} from '../types';
import { createRefreshToken, issueRefreshToken } from '../auth/refresh-token';

export const createTokens = async ({
  body,
  iss,
  clientID,
  audience,
  rulesDirectory,
  people,
  scope: scopeConfig,
}: {
  body: Request['body'];
  iss: string;
  clientID: string;
  audience: string;
  rulesDirectory: string | undefined;
  people: Iterable<Person>;
  scope: ScopeConfig;
}) => {
  let { grant_type }: { grant_type: GrantType } = body;
  let scope = deriveScope({ scopeConfig, clientID, audience });

  let accessToken = getBaseAccessToken({ iss, grant_type, scope, audience });
  let user: Person | undefined;
  let nonce: string | undefined;

  if (grant_type === 'client_credentials') {
    return { access_token: createJsonWebToken(accessToken) };
  }
  // TODO: check refresh_token expiry date
  else if (grant_type === 'refresh_token') {
    let { refresh_token: refreshTokenValue } = body;
    let refreshToken: RefreshToken['payload'] = JSON.parse(decode(refreshTokenValue));

    let findUser = createPersonQuery(people);

    user = findUser((person) => person.id === refreshToken.user.id);

    nonce = refreshToken.nonce;
  } else {
    let result = verifyUserExistsInStore({
      people,
      body,
      grant_type,
    });

    user = result.user;
    nonce = result.nonce;
  }

  assert(!!nonce, `400::No nonce in request`);
  assert(!!user, '500::No user found');

  let { idTokenData, userData } = getIdToken({
    body,
    iss,
    user,
    clientID,
    nonce,
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
    access_token: createJsonWebToken({
      ...accessToken,
      ...context.accessToken,
    }),
    id_token: createJsonWebToken({
      ...userData,
      ...context.idToken,
    }),
    refresh_token: issueRefreshToken(scope, grant_type) ? createRefreshToken({
      exp: idTokenData.exp,
      rotations: 0,
      scope,
      user,
      nonce
    }) : undefined
  };
};

export const getIdToken = ({
  body,
  iss,
  user,
  clientID,
  nonce,
}: {
  body: Request['body'];
  iss: string;
  user: Person;
  clientID: string;
  nonce: string | undefined;
}) => {
  let userData: RuleUser = {
    name: body?.name,
    email: body?.email,
    email_verified: true,
    user_id: body?.id,
    nickname: body?.nickname,
    picture: body?.picture,
    identities: body?.identities,
  };

  assert(!!user.email, '500::User in store requires an email');

  let idTokenData: IdTokenData = {
    alg: 'RS256',
    typ: 'JWT',
    iss,
    exp: expiresAt(),
    iat: epochTime(),
    email: user.email,
    aud: clientID,
    sub: user.id,
  };

  if (typeof nonce !== 'undefined') {
    idTokenData.nonce = nonce;
  }

  return { userData, idTokenData };
};

export const getBaseAccessToken = ({
  iss,
  grant_type,
  scope,
  audience,
}: {
  iss: string;
  grant_type: string;
  scope: string;
  audience: string;
}): Partial<AccessTokenPayload> => ({
  iss,
  exp: expiresAt(),
  iat: epochTime(),
  aud: audience,
  gty: grant_type,
  scope,
});

const verifyUserExistsInStore = ({
  people,
  body,
  grant_type,
}: {
  people: Iterable<Person>;
  body: Request['body'];
  grant_type: string;
}) => {
  let { code } = body;
  let personQuery = createPersonQuery(people);
  let nonce: string | undefined;
  let username: string;
  let password: string | undefined;

  if (grant_type === 'password') {
    username = body.username;
    password = body.password;
  } else {
    // specifically grant_type === 'authorization_code'
    // but naively using it to handle other cases at the moment
    assert(typeof code !== 'undefined', '400::no code in /oauth/token');
    [nonce, username] = decodeBase64(code).split(':');
  }

  assert(!!username, `400::no nonce in store for ${code}`);

  let user: Person | undefined = personQuery((person) => {
    assert(!!person.email, `500::no email defined on person scenario`);

    let valid = person.email.toLowerCase() === username.toLowerCase();

    if (typeof password === 'undefined') {
      return valid;
    } else {
      return valid && password === person.password;
    }
  });

  assert(!!user, '401::Unauthorized');

  return { user, nonce };
};
