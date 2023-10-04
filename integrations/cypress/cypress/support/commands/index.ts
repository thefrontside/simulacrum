/* eslint-disable @typescript-eslint/no-namespace */

import {createAtom} from '@effection/atom';
import {makeCreateSimulation} from './create-simulation';
import type {CreateSimulation, Person, TestState, Token} from '../types';
import {makeGetClientFromSpec} from '../utils/spec';
import {makeSDKCommands} from './add-sdk-commands';
import type {Auth0Result} from 'auth0-js';
import './nextjs_auth0/get-user-info';
import './nextjs_auth0/get-user-tokens';
import {SimulationId} from "./constants";
import {Simulation} from "@simulacrum/client";
import Bluebird from "cypress/types/bluebird";
import {assert} from "assert-ts";

declare global {
    namespace Cypress {
        interface Chainable<Subject> {
            createSimulation(options?: CreateSimulation): Chainable<Subject>;

            destroySimulation(): Bluebird<void>;

            login(person?: Partial<Person>): Chainable<string>;

            logout(): Chainable<AUTWindow>;

            given(attrs?: Partial<Person>): Chainable<Person>;

            out<S = unknown>(msg: string): Chainable<S>;

            getUserInfo(accessToken: string): Chainable<Person>;

            getUserTokens(person: Person): Chainable<Auth0Result & { scope: string }>;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            task<T>(event: string, args?: any, options?: Partial<Loggable & Timeoutable>): Chainable<T>
        }
    }
}

const atom = createAtom<TestState>({});

const getClientFromSpec = makeGetClientFromSpec({atom, port: Cypress.env('PORT') || 4000});

Cypress.Commands.add('createSimulation', makeCreateSimulation({atom, getClientFromSpec}));

Cypress.Commands.add('given', (attrs: Partial<Person> = {}) => {
    return cy.then((): Bluebird<Person> => {

        return new Cypress.Promise((resolve, reject) => {
            let client = getClientFromSpec(Cypress.spec.name);

            let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

            assert(!!simulation, 'no sumulation in given');

            cy.log(`creating person with attrs: ${JSON.stringify(attrs)}`);

            client.given<Person>(simulation, "person", attrs)
                .then((scenario) => {
                    cy.log(`person created ${JSON.stringify(scenario)}`);

                    atom.slice(Cypress.spec.name).update(current => {
                        return {
                            ...current, person: scenario.data
                        };
                    });

                    resolve(scenario.data);
                })
                .catch((e) => {
                    cy.log(`given failed ${e.message}`);

                    reject(e);
                });
        })
    });
});


Cypress.Commands.add('destroySimulation', () => {
    return new Cypress.Promise((resolve, reject) => {
        let client = getClientFromSpec(Cypress.spec.name);

        client.destroySimulation({id: SimulationId} as Simulation).then(() => {
            cy.log('simulation destroyed');

            resolve();
        }).catch(e => {
            cy.log(`destroy simulation failed with ${e.message}`);
            reject(e);
        });
    });
});

makeSDKCommands({atom, getClientFromSpec});

export {};
