import { sign, SignOptions } from "jsonwebtoken";
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

export function createAuthJWT(authNamespace: string): string {
  return createJsonWebToken({
    [`${authNamespace}`]: 'what can we add here',
  });
}
