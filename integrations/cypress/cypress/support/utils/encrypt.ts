import hkdf from 'futoin-hkdf';
import { EncryptJWT } from 'jose';

const BYTE_LENGTH = 32;
const ENCRYPTION_INFO = 'JWE CEK';

const deriveKey = (secret: string) => hkdf(secret, BYTE_LENGTH, { info: ENCRYPTION_INFO, hash: 'SHA-256' });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encrypt(arg: any) {
  let { secret, ...thingToEncrypt } = arg;
  console.dir({ thingToEncrypt });
  let epochNow = (Date.now() / 1000) | 0;

  return new EncryptJWT(thingToEncrypt)
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
