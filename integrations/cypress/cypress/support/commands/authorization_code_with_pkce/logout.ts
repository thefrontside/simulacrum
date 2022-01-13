import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-logout-pkce');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeLogoutWithPKCE = () => () => {
  log('logging out');

  return cy
    .clearCookies()
    .reload();
};
