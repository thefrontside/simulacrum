import { Slice } from '@effection/atom';
import { makeCypressLogger } from '../utils/cypress-logger';
import { getConfig } from '../utils/config';
import { TestState } from '../types';
import { makeAuthorizationCodeLogin } from './authorization_code';
import { makeLoginWithPKCE } from './authorization_code_with_pkce';

export interface MakeLoginOptions {
  atom: Slice<TestState>;
}

const log = makeCypressLogger('simulacrum-login');

export const makeLogin = ({ atom }: MakeLoginOptions) => () => {
  let config = getConfig();

  let flow = typeof config.cookieSecret === 'undefined' ? 'authorization_code' : 'authorization_code_with_pkce';

  log()
  let login = flow === 'authorization_code' ? makeAuthorizationCodeLogin : makeLoginWithPKCE;


  return login({ atom });
};
