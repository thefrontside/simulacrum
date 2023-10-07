import { assert } from "assert-ts";
import { cyLog, getPersonAtomSlice } from "../../utils";

export function login() {
    return cy.then(() => {
        return new Cypress.Promise((resolve, reject) => {
            import('./auth').then(m => m.authClient).then((auth0Client) => {
                let person = getPersonAtomSlice();
                assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

                auth0Client.getTokenSilently({
                    currentUser: person.email,
                    test: Cypress.currentTest.title,
                    // Ensures a fresh token is always retrieved
                    ignoreCache: true,
                })
                    .then((token) => {
                        cy.log(`successfully logged in with token ${JSON.stringify(token)}`);
                        auth0Client.getUser().then((userObject) => {
                            cyLog(`logged in user object:`, userObject);
                        });
                        resolve(token);
                    }).catch((e) => {
                    cyLog(`login failed with error:`, e);
                    reject(e);
                });
            });
        });
    });
}
