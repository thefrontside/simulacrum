import { login } from "./login";
import { cyLog } from "../../utils";

export function registerAuth0ReactCommands() {
    Cypress.Commands.add('login', login);
    Cypress.Commands.add('logout', () => {
        // cyLog('logging out');
        return cy.clearCookies().reload();
    });
}
