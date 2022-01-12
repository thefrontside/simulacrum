import { Slice } from '@effection/atom';
import { TestState } from '../../types';
import { assert } from 'assert-ts';
import { makeCypressLogger } from '../../utils/cypress-logger';
import { getConfig } from '../../utils/config';

export interface MakeLoginOptions {
  atom: Slice<TestState>;
}

const log = makeCypressLogger('simulacrum-login-ac');

export const makeAuthorizationCodeLogin = ({ atom }: MakeLoginOptions) => () => {
  let { sessionCookieName, cookieSecret, audience } = getConfig();

  try {
    cy.getCookie(sessionCookieName).then((cookieValue) => {
      if (cookieValue) {
        log('Skip logging in again, session already exists');
        return true;
      } else {
        cy.clearCookies();

        let person = atom.slice(Cypress.spec.name, 'person').get();

        assert(!!person, `no scenario in login`);
        assert(!!person.email, 'no email defined in scenario');

        cy.getUserTokens(person).then((response) => {
          let { accessToken, expiresIn, idToken, scope } = response;

          log(`successfully called getUserTokens with ${person?.email}`);

          assert(!!accessToken, 'no access token in login');

          cy.getUserInfo(accessToken).then((user) => {
            assert(typeof expiresIn !== 'undefined', 'no expiresIn in login');

            let payload = {
              secret: cookieSecret,
              audience,
              user,
              idToken,
              accessToken,
              accessTokenScope: scope,
              accessTokenExpiresAt: Date.now() + expiresIn,
              createdAt: Date.now(),
            };

            cy.task<string>('encrypt', payload).then((encryptedSession) => {
              log('successfully encrypted session');

              cy.setCookie(sessionCookieName, encryptedSession);
            });
          });
        });
      }
    });
  } catch(error) {
    console.error(error);
    throw new Error(error);
  }
};
