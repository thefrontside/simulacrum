import type { Person } from "../../types";
import { cyLog, getAtom, getClientFromSpec, getSimulationAtomSlice } from "../../utils";
import { assert } from "assert-ts";

export function given(attrs: Partial<Person> = {}) {
    return cy.then(() => {

        return new Cypress.Promise((resolve, reject) => {
            let client = getClientFromSpec(Cypress.spec.name);

            let simulation = getSimulationAtomSlice();

            assert(!!simulation, 'no sumulation in given');

            client.given<Person>(simulation, "person", attrs)
                .then((scenario) => {
                    cyLog('person created:', scenario);

                    getAtom().slice(Cypress.spec.name).update(current => {
                        return {
                            ...current, person: scenario.data
                        };
                    });

                    resolve(scenario.data);
                })
                .catch((e) => {
                    cyLog('Failed to create person:', e);
                    reject(e);
                });
        });
    });
}
