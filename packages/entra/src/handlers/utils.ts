import { createHash } from "node:crypto";
import { encode, decode } from "base64-url";
import { assert } from "assert-ts";
import type { ExtendedSimulationStore } from "../store/index.ts";
import type { EntraUser } from "../store/entities.ts";
import type { AuthorizationCode, RefreshTokenPayload } from "../types.ts";

type Predicate<T> = (this: void, value: T, index: number, obj: T[]) => boolean;

export const createUserQuery =
  (store: ExtendedSimulationStore) => (predicate: Predicate<EntraUser>) => {
    const users = store.schema.users.selectTableAsList(store.store.getState());
    return users.find(predicate);
  };

// Authorization codes and refresh tokens are encoded statelessly as base64url
// JSON so the token endpoint can be served without any server side session for
// the code exchange, mirroring how the auth0 simulator encodes refresh tokens.
export const encodeAuthorizationCode = (code: AuthorizationCode): string =>
  encode(JSON.stringify(code));

// A malformed (truncated, tampered, or non-base64url) code/token would otherwise
// throw a raw SyntaxError and surface as an opaque 500. Real Entra answers a bad
// grant with `400 invalid_grant`, so mirror that — it keeps a developer's OAuth
// library and their debugging on the happy path.
const decodeStatelessToken = <T>(value: string): T => {
  try {
    return JSON.parse(decode(value)) as T;
  } catch {
    assert(false, "400::invalid_grant");
  }
};

export const decodeAuthorizationCode = (value: string): AuthorizationCode =>
  decodeStatelessToken<AuthorizationCode>(value);

export const encodeRefreshToken = (token: RefreshTokenPayload): string =>
  encode(JSON.stringify(token));

export const decodeRefreshToken = (value: string): RefreshTokenPayload =>
  decodeStatelessToken<RefreshTokenPayload>(value);

// PKCE verification (RFC 7636). Returns true when the presented verifier
// satisfies the challenge that was captured at /authorize time. When no
// challenge was captured (non-PKCE flow) verification is a no-op.
export const verifyPkce = ({
  codeVerifier,
  codeChallenge,
  codeChallengeMethod,
}: {
  codeVerifier: string | undefined;
  codeChallenge: string | undefined;
  codeChallengeMethod: string | undefined;
}): boolean => {
  if (!codeChallenge) {
    return true;
  }

  if (!codeVerifier) {
    return false;
  }

  if (!codeChallengeMethod || codeChallengeMethod.toUpperCase() === "PLAIN") {
    return codeVerifier === codeChallenge;
  }

  // S256: BASE64URL(SHA256(ASCII(code_verifier)))
  let hashed = createHash("sha256").update(codeVerifier).digest("base64url");
  return hashed === codeChallenge;
};

export const scopeIncludes = (scope: string, value: string): boolean =>
  scope.split(" ").filter(Boolean).includes(value);
