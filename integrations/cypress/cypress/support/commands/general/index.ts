import { makeCreateSimulation } from "./create-simulation";
import { given } from "./given";
import { destroySimulation } from "./destroy-simulation";

export function registerGeneralCommands() {
    Cypress.Commands.add('createSimulation', makeCreateSimulation);
    Cypress.Commands.add('destroySimulation', destroySimulation);
    Cypress.Commands.add('given', given);
}
