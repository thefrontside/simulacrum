import { sign, SignOptions } from "jsonwebtoken";
import { IdToken } from '../types';
import { JWKS, PRIVATE_KEY } from "./constants";

export const parseKey = (key: string): string => key.split("~~").join("\n");

export const createJsonWebToken = (
  payload: Record<string, unknown>,
  privateKey = parseKey(PRIVATE_KEY),
  options: SignOptions = {
    algorithm: "RS256",
    keyid: JWKS.keys[0].kid,
  }
): string => {
  return sign(payload, privateKey, options);
};

export function createAuthJWT(authNamespace: string, audience: string): string {
  return createJsonWebToken({
    [`${authNamespace}`]: 'decorate token',
    aud: audience,
    iss: `${authNamespace}/`,
  });
}

export const idTokendecoded = [
  'iss',
  'aud',
  'exp',
  'nbf',
  'iat',
  'jti',
  'azp',
  'nonce',
  'auth_time',
  'at_hash',
  'c_hash',
  'acr',
  'amr',
  'sub_jwk',
  'cnf',
  'sip_from_tag',
  'sip_date',
  'sip_callid',
  'sip_cseq_num',
  'sip_via_branch',
  'orig',
  'dest',
  'mky',
  'events',
  'toe',
  'txn',
  'rph',
  'sid',
  'vot',
  'vtm'
];

function atob(str: string) {
  return Buffer.from(str, 'base64').toString('binary');
}

const decodeB64 = (input: string) =>
  decodeURIComponent(
    atob(input)
      .split('')
      .map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );

export const urlDecodeB64 = (input: string): string =>
  decodeB64(input.replace(/_/g, '/').replace(/-/g, '+'));

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const decode = (token: string) => {
  let parts = token.split('.');
  let [header, payload, signature] = parts;

  if (parts.length !== 3 || !header || !payload || !signature) {
    throw new Error('ID token could not be decoded');
  }
  let payloadJSON = JSON.parse(urlDecodeB64(payload));
  let claims: IdToken = { __raw: token };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = {};
  Object.keys(payloadJSON).forEach(k => {
    claims[k] = payloadJSON[k];
    if (!idTokendecoded.includes(k)) {
      user[k] = payloadJSON[k];
    }
  });
  return {
    encoded: { header, payload, signature },
    header: JSON.parse(urlDecodeB64(header)),
    claims,
    user
  };
};
