import { Slice } from '@effection/atom';
import { TestState } from '../types';
import { auth0Client } from '../auth';
import { assert } from 'assert-ts';

export interface MakeLoginOptions {
  atom: Slice<TestState>;
}

export const makeLogin = ({ atom }: MakeLoginOptions) => () => {
  return new Cypress.Promise((resolve, reject) => {
    let person = atom.slice(Cypress.spec.name, 'person').get();

    assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

    auth0Client.getTokenSilently({ ignoreCache: true, currentUser: person.email, test: Cypress.currentTest.title })
               .then(token => {
                  Cypress.log({
                    name: 'simulacrum-login',
                    displayName: 'simulacrum-login',
                    message: `successfully logged in with token ${JSON.stringify(token)}`
                  });

                  resolve(token);
               })
               .catch((e) => {
                Cypress.log({
                  name: 'simulacrum-login',
                  displayName: 'simulacrum-login',
                  message: `login failed ${e.message}`
                });

                 reject(e);
               });
  });
};
