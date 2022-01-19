import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-logout-pkce');

export const makeLogout = () => () => {
  log('logging out');

  return cy
    .clearCookies()
    .reload();
};
