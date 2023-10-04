import type {Auth0SDKs, CommandMaker, Token} from '../types';
import {makeCypressLogger} from '../utils/cypress-logger';
import {getConfig} from '../utils/config';
import {assert} from "assert-ts";
import Bluebird from "cypress/types/bluebird";

export const makeSDKCommands = ({atom}: CommandMaker) => {
    let config = getConfig();

    let provider = config.sdk;

    // cy.log(`Using ${provider} provider`);


    if (provider === 'nextjs_auth0') {
        Cypress.Commands.add('login', () => {
            cy.then(() => {
                let {sessionCookieName, cookieSecret, audience} = getConfig();

                try {
                    cy.getCookie(sessionCookieName).then((cookieValue) => {
                        cy.log(`cookie ${sessionCookieName} is ${cookieValue}`);
                        if (cookieValue) {
                            cy.log('Skip logging in again, session already exists');
                            return true;
                        } else {
                            cy.clearCookies();

                            let person = atom.slice(Cypress.spec.name, 'person').get();

                            assert(!!person, `no scenario in login`);
                            assert(!!person.email, 'no email defined in scenario');

                            cy.getUserTokens(person).then((response) => {
                                let {accessToken, expiresIn, idToken, scope} = response;

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
            });
        });
        Cypress.Commands.add('logout', () => {
            cy.log('logging out');
            return cy.request('/api/auth/logout').reload();
        });
    }

    if (provider === 'auth0_react') {
        Cypress.Commands.add('login', () => {
            return cy.then((): Bluebird<string> => {
                return new Cypress.Promise((resolve, reject) => {
                    import('./auth0_react/auth').then(m => m.auth).then((auth0Client) => {
                        let person = atom.slice(Cypress.spec.name, 'person').get();

                        assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

                        auth0Client.getTokenSilently({
                            ignoreCache: true,
                            currentUser: person.email,
                            test: Cypress.currentTest.title
                        })
                            .then((token) => {
                                cy.log(`successfully logged in with token ${JSON.stringify(token)}`);

                                resolve(token);
                            }).catch((e) => {
                            console.error(e);

                            reject(e);
                        });
                    });
                });

            })
        });
        Cypress.Commands.add('logout', () => {
            cy.log('logging out');
            return cy.clearCookies().reload();
        });
    }
};
