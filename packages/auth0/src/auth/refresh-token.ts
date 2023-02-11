import type { GrantType, RefreshToken } from '../types';
import { epochTime } from './date';
import { encode } from "base64-url";
import { assert } from 'assert-ts';

export function issueRefreshToken(scope: string, grantType: GrantType): boolean {
  return grantType === 'refresh_token' || scope.includes('offline_access');
}

export function createRefreshToken({ exp, rotations = 0, scope, user, nonce }: Omit<RefreshToken, 'iat'>): string {
  assert(!!user.id, `no identifier for user`);

  return encode(JSON.stringify({
    exp,
    iat: epochTime(),
    rotations,
    scope,
    user: { id: user.id },
    nonce
  }));
}
