import { CommandMaker } from '../../types';
import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-logout-ac');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeAuthorizationCodeLogout = ({ atom, getClientFromSpec }: CommandMaker) => () => {
  log('logging out');
  return cy.request('/api/auth/logout')
            .reload();
};
