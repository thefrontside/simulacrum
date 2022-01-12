import { Slice } from '@effection/atom';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { TestState } from '../types';
import { makeAuthorizationCodeLogin } from './authorization_code';
import { makeLoginWithPKCE } from './authorization_code_with_pkce';

type AuthorizationCodeFlows = 'authorization_code' | 'authorization_code_with_pkce'
export interface MakeLoginOptions {
  atom: Slice<TestState>;
}

type LoginMaker = ({ atom }: MakeLoginOptions) => () => void

const log = makeCypressLogger('simulacrum-login-maker');


const authorizationFlows: Record<AuthorizationCodeFlows, LoginMaker> = {
  authorization_code: makeAuthorizationCodeLogin,
  authorization_code_with_pkce: makeLoginWithPKCE,
} as const;

export const makeLogin = ({ atom }: MakeLoginOptions) => () => {
  let config = getConfig();

  let flow: AuthorizationCodeFlows = typeof config.cookieSecret === 'undefined' ? 'authorization_code' : 'authorization_code_with_pkce' as const;

  log(`Using ${flow} flow`);

  return authorizationFlows[flow]({ atom });
};
