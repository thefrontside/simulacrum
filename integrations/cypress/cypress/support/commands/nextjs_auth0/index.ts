import { getUserTokens } from "./get-user-tokens";
import { getUserInfo } from "./get-user-info";
import { login } from "./login";

export function registerNextjsAuth0Commands() {
    Cypress.Commands.add('getUserTokens', getUserTokens);
    Cypress.Commands.add('getUserInfo', getUserInfo);
    Cypress.Commands.add('login', login);
    Cypress.Commands.add('logout', () => {
        cy.log('logging out');
        return cy.request('/api/auth/logout').reload();
    });
}
