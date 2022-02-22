import type { EncryptPayload } from '../types';
import hkdf from 'futoin-hkdf';
import type { JWTPayload } from 'jose';
import { EncryptJWT } from 'jose';

const BYTE_LENGTH = 32;
const ENCRYPTION_INFO = 'JWE CEK';

const deriveKey = (secret: string) => hkdf(secret, BYTE_LENGTH, { info: ENCRYPTION_INFO, hash: 'SHA-256' });

export function encrypt(arg: EncryptPayload): Promise<string> {
  let { secret, ...thingToEncrypt } = arg;
  let epochNow = (Date.now() / 1000) | 0;

  return new EncryptJWT(thingToEncrypt as unknown as JWTPayload)
    .setProtectedHeader({
      alg: 'dir',
      enc: 'A256GCM',
      uat: epochNow,
      iat: epochNow,
      exp: epochNow + 7 * 24 * 60 * 60
    })
    .setIssuedAt(epochNow)
    .setExpirationTime(epochNow + 7 * 24 * 60 * 60)
    .encrypt(deriveKey(secret));
}
