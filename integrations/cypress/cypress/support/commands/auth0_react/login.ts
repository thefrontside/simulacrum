import type { CommandMaker } from '../../types';
import { assert } from 'assert-ts';
import { makeCypressLogger } from '../../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-login-pkce');

export const makeLogin = ({ atom }: Pick<CommandMaker, 'atom'>) => () => {
  return new Cypress.Promise((resolve, reject) => {
    import('./auth').then(m => m.auth).then((auth0Client) => {
      let person = atom.slice(Cypress.spec.name, 'person').get();

      assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

      auth0Client.getTokenSilently({ ignoreCache: true, currentUser: person.email, test: Cypress.currentTest.title })
      .then((token) => {
        log(`successfully logged in with token ${JSON.stringify(token)}`);

        resolve(token);
      }).catch((e) => {
        console.error(e);

        reject(e);
      });
    });
  });
};
