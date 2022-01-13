import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-logout-pkce');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeLogout = () => () => {
  log('logging out');

  return cy
    .destroySimulation()
    .clearCookies()
    .reload();
};
