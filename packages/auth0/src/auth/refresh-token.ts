import type { GrantType } from '../types';

export function issueRefreshToken(grantType: GrantType): boolean {
  return grantType === 'refresh_token';
}
