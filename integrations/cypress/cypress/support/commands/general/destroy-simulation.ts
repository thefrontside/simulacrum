import { getClientFromSpec } from "../../utils";
import { SimulationId } from "../constants";
import type { Simulation } from "@simulacrum/client";

export function destroySimulation() {
    return cy.then(() => {
        new Cypress.Promise((resolve, reject) => {
            let client = getClientFromSpec(Cypress.spec.name);

            client.destroySimulation({ id: SimulationId } as Simulation).then(() => {
                cy.log('simulation destroyed');

                resolve();
            }).catch(e => {
                cy.log(`destroy simulation failed with ${e.message}`);
                reject(e);
            });
        });
    });
}
