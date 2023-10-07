import { assert } from "assert-ts";
import { getConfig,getPersonAtomSlice } from "../../utils";

export function login(){
    let { sessionCookieName, cookieSecret, audience } = getConfig();

    try {
        cy.getCookie(sessionCookieName).then((cookieValue) => {
            cy.log(`cookie ${sessionCookieName} is ${cookieValue}`);
            if (cookieValue) {
                cy.log('Skip logging in again, session already exists');
                return true;
            } else {
                cy.clearCookies();

                let person = getPersonAtomSlice();

                assert(!!person, `no scenario in login`);
                assert(!!person.email, 'no email defined in scenario');

                cy.getUserTokens(person).then((response) => {
                    let { accessToken, expiresIn, idToken, scope } = response;

                    cy.log(`successfully called getUserTokens with ${person?.email}`);

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
                            cy.log('successfully encrypted session');

                            cy.setCookie(sessionCookieName, encryptedSession);
                        });
                    });
                });
            }
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
}
