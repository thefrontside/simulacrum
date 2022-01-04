import { Slice } from '@effection/atom';
import { TestState } from '../types';
import { assert } from 'assert-ts';

export interface MakeLoginOptions {
  atom: Slice<TestState>;
}

export const makeLogin = ({ atom }: MakeLoginOptions) => () => {

  let sessionCookieName = Cypress.env('auth0SessionCookieName');

  try {
    cy.getCookie(sessionCookieName).then((cookieValue) => {
      /* Skip logging in again if session already exists */
      if (cookieValue) {
        return true;
      } else {
        cy.clearCookies();

        let person = atom.slice(Cypress.spec.name, 'person').get();

        assert(!!person, `no scenario in login`);
        assert(!!person.email, 'no email defined in scenario');

        cy.getUserTokens(person).then((response) => {
          let { accessToken, expiresIn, idToken, scope } = response;

          assert(!!accessToken, 'no access token in login');

          cy.getUserInfo(idToken).then((user) => {
            assert(typeof expiresIn !== 'undefined', 'no expiresIn in login');

            let payload = {
              secret: Cypress.env('auth0CookieSecret'),
              user,
              idToken,
              accessToken,
              accessTokenScope: scope,
              accessTokenExpiresAt: Date.now() + expiresIn,
              createdAt: Date.now(),
            };

            cy.task<string>('encrypt', payload).then((encryptedSession) => {
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
