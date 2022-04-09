import type { GrantType, RefreshToken } from '../types';
import { epochTime } from './date';

export function issueRefreshToken(grantType: GrantType): boolean {
  return grantType === 'refresh_token';
}

export function createRefreshToken({ exp, rotations = 0, scope }: Omit<RefreshToken['payload'], 'iat'>): RefreshToken['payload'] {
  return {
    exp,
    iat: epochTime(),
    rotations,
    scope,
  };
}
