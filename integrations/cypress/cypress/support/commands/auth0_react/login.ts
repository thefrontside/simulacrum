import { assert } from "assert-ts";
import { cyLog, getPersonAtomSlice } from "../../utils";

export function login() {
    return cy.then(() => {
        return new Cypress.Promise((resolve, reject) => {
            import('./auth').then(m => m.Auth0ReactConfig()).then((auth0Client) => {
                let person = getPersonAtomSlice();
                assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

                auth0Client.getTokenSilently({
                    ignoreCache: true, currentUser: person.email, test: Cypress.currentTest.title
                })
                    .then((token) => {
                        cy.log(`successfully logged in with token ${JSON.stringify(token)}`);

                        resolve(token);
                    }).catch((e) => {
                    cyLog(`login failed with error:`, e);
                    reject(e);
                });
            });
        });
    });
}
