import { CommandMaker } from '../../types';
import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-logout-pkce');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeAuthorizationCodeLogout = ({ atom, getClientFromSpec }: CommandMaker) => () => {
  log('logging out');

  return new Cypress.Promise((resolve) => {
    import('./auth').then(m => m.auth)
                    .then((auth) => {
      let url = auth.buildLogoutUrl();

      cy.request(url).then(resolve);
    });
  });
};
