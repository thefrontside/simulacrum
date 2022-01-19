import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-logout-ac');

export const makeLogout = () => () => {
  log('logging out');
  return cy.request('/api/auth/logout')
            .reload();
};
