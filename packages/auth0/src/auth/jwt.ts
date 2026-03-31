import type { SignOptions } from "jsonwebtoken";
import * as jwt from "jsonwebtoken";
import { JWKS, PRIVATE_KEY } from "./constants.ts";

export const parseKey = (key: string): string => key.split("~~").join("\n");

type SignPayload = Parameters<typeof jwt.sign>[0];

export function createJsonWebToken<P extends SignPayload>(
  payload: P,
  privateKey = parseKey(PRIVATE_KEY),
  options: SignOptions = {
    algorithm: "RS256",
    keyid: JWKS.keys[0].kid,
  },
): string {
  return jwt.sign(payload, privateKey, options);
}
