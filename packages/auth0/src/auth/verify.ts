import assert from 'assert-ts';
import { decode } from './jwt';

export interface JWTVerifyOptions {
  iss: string;
  aud: string;
  id_token: string;
  nonce?: string;
  leeway?: number;
  max_age: number;
  organizationId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNumber = (n: any): n is number => typeof n === 'number';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const verify = (options: JWTVerifyOptions) => {
  if (!options.id_token) {
    throw new Error('ID token is required but missing');
  }

  let decoded = decode(options.id_token);

  if (!decoded.claims.iss) {
    throw new Error(
      'Issuer (iss) claim must be a string present in the ID token'
    );
  }

  if (decoded.claims.iss !== options.iss) {
    throw new Error(
      `Issuer (iss) claim mismatch in the ID token; expected "${options.iss}", found "${decoded.claims.iss}"`
    );
  }

  if (!decoded.user.sub) {
    throw new Error(
      'Subject (sub) claim must be a string present in the ID token'
    );
  }

  if (decoded.header.alg !== 'RS256') {
    throw new Error(
      `Signature algorithm of "${decoded.header.alg}" is not supported. Expected the ID token to be signed with "RS256".`
    );
  }

  if (
    !decoded.claims.aud ||
    !(
      typeof decoded.claims.aud === 'string' ||
      Array.isArray(decoded.claims.aud)
    )
  ) {
    throw new Error(
      'Audience (aud) claim must be a string or array of strings present in the ID token'
    );
  }
  if (Array.isArray(decoded.claims.aud)) {
    if (!decoded.claims.aud.includes(options.aud)) {
      throw new Error(
        `Audience (aud) claim mismatch in the ID token; expected "${
          options.aud
        }" but was not one of "${decoded.claims.aud.join(', ')}"`
      );
    }
    if (decoded.claims.aud.length > 1) {
      if (!decoded.claims.azp) {
        throw new Error(
          'Authorized Party (azp) claim must be a string present in the ID token when Audience (aud) claim has multiple values'
        );
      }
      if (decoded.claims.azp !== options.aud) {
        throw new Error(
          `Authorized Party (azp) claim mismatch in the ID token; expected "${options.aud}", found "${decoded.claims.azp}"`
        );
      }
    }
  } else if (decoded.claims.aud !== options.aud) {
    throw new Error(
      `Audience (aud) claim mismatch in the ID token; expected "${options.aud}" but found "${decoded.claims.aud}"`
    );
  }
  if (options.nonce) {
    if (!decoded.claims.nonce) {
      throw new Error(
        'Nonce (nonce) claim must be a string present in the ID token'
      );
    }
    if (decoded.claims.nonce !== options.nonce) {
      throw new Error(
        `Nonce (nonce) claim mismatch in the ID token; expected "${options.nonce}", found "${decoded.claims.nonce}"`
      );
    }
  }

  if (options.max_age && !isNumber(decoded.claims.auth_time)) {
    throw new Error(
      'Authentication Time (auth_time) claim must be a number present in the ID token when Max Age (max_age) is specified'
    );
  }

  /* istanbul ignore next */
  if (!isNumber(decoded.claims.exp)) {
    throw new Error(
      'Expiration Time (exp) claim must be a number present in the ID token'
    );
  }
  if (!isNumber(decoded.claims.iat)) {
    throw new Error(
      'Issued At (iat) claim must be a number present in the ID token'
    );
  }

  let leeway = options.leeway || 60;
  let now = new Date(Date.now());
  let expDate = new Date(0);
  let nbfDate = new Date(0);
  let authTimeDate = new Date(0);

  assert(!!decoded.claims.auth_time, `no auth_time in ${decoded}`);
  authTimeDate.setUTCSeconds(
    parseInt(decoded.claims.auth_time) + options.max_age + leeway
  );

  expDate.setUTCSeconds(decoded.claims.exp + leeway);

  assert(!!decoded.claims.nbf, `no auth_time in ${decoded}`);
  nbfDate.setUTCSeconds(decoded.claims.nbf - leeway);

  if (now > expDate) {
    throw new Error(
      `Expiration Time (exp) claim error in the ID token; current time (${now}) is after expiration time (${expDate})`
    );
  }

  if (isNumber(decoded.claims.nbf) && now < nbfDate) {
    throw new Error(
      `Not Before time (nbf) claim in the ID token indicates that this token can't be used just yet. Currrent time (${now}) is before ${nbfDate}`
    );
  }

  if (isNumber(decoded.claims.auth_time) && now > authTimeDate) {
    throw new Error(
      `Authentication Time (auth_time) claim in the ID token indicates that too much time has passed since the last end-user authentication. Currrent time (${now}) is after last auth at ${authTimeDate}`
    );
  }

  if (options.organizationId) {
    if (!decoded.claims.org_id) {
      throw new Error(
        'Organization ID (org_id) claim must be a string present in the ID token'
      );
    } else if (options.organizationId !== decoded.claims.org_id) {
      throw new Error(
        `Organization ID (org_id) claim mismatch in the ID token; expected "${options.organizationId}", found "${decoded.claims.org_id}"`
      );
    }
  }

  return decoded;
};
