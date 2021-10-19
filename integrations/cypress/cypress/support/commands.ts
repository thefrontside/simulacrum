/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { Client, createClient, Simulation } from '@simulacrum/client';
import { auth0Client } from './auth';
import { assert } from 'assert-ts';
import { createAtom } from '@effection/atom';

type TestState = Record<string, {
  client: Client;
  simulation?: Simulation;
  person?: Person
}>;

interface Token {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access_token: Record<string, any>;
  expires_in: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id_token: Record<string, any>
}
declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      createSimulation(options: Auth0ClientOptions): Chainable<Subject>;
      login(person?: Partial<Person>): Chainable<Token>;
      logout(): Chainable<void>;
      given(attrs?: Partial<Person>): Chainable<Person>;
      out<S = unknown>(msg: string): Chainable<S>
    }
  }
}

const atom = createAtom<TestState>({});

export interface Person { email: string; password: string }


const ClientPort = process.env.PORT || 4000;

function getClientFromSpec (spec: string) {
  let client: Client;

  if(!atom.slice(spec).get()) {
    client = createClient(`http://localhost:${ClientPort}`);
    atom.set({ [spec]: { client: client } });
  }

  return atom.slice(spec, 'client').get();
}

Cypress.Commands.add('createSimulation', (options: Auth0ClientOptions) => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);

    let { domain, client_id, ...auth0Options } = options;

    assert(typeof domain !== 'undefined', 'domain is a required option');

    let port = Number(domain.split(':').slice(-1)[0]);

    assert(typeof client !== 'undefined', 'no client created in createSimulation');

    client.createSimulation("auth0", {
      options: {
        ...auth0Options,
        clientId: client_id,
      },
      services: {
        auth0: {
          port,
        },
      },
      key: 'cypress'
    }).then(simulation => {
      atom.slice(Cypress.spec.name).update(current => {
        return {
          ...current,
          simulation
        };
      });

      Cypress.log({
        name: 'simulacrum-create-simulation',
        displayName: 'simulacrum-create-simulation',
        message: `sumalation created ${JSON.stringify(simulation)}`
      });

      resolve(simulation);
    }).catch((e) => {
      Cypress.log({
        name: 'simulacrum-create-simulation',
        displayName: 'simulacrum-create-simulation',
        message: `create-simulation failed ${e.message}`
      });

      reject(e);
    });
  });
});

Cypress.Commands.add('given', (attrs: Partial<Person> = {}) => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);
    let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

    assert(!!simulation, 'no sumulation in given');
    assert(!!client && typeof client.given === 'function', 'no valid client in given');

    client.given<Person>(simulation, "person", attrs)
      .then((scenario) => {
        atom.slice(Cypress.spec.name).update(current => {
          return {
            ...current,
            person: scenario.data
          };
        });

        Cypress.log({
          name: 'simulacrum-given',
          displayName: 'simulacrum-given',
          message: `scenario created with ${JSON.stringify(scenario)}`
        });

        resolve(scenario.data);
      })
      .catch((e) => {
        Cypress.log({
          name: 'simulacrum-given',
          displayName: 'simulacrum-given',
          message: `given failed ${e.message}`
        });

        reject(e);
      });
  });
});

Cypress.Commands.add('login', () => {
  return new Cypress.Promise((resolve, reject) => {
    let person = atom.slice(Cypress.spec.name, 'person').get();

    assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

    auth0Client.getTokenSilently({ ignoreCache: true, currentUser: person.email, test: Cypress.currentTest.title })
               .then(token => {
                  Cypress.log({
                    name: 'simulacrum-login',
                    displayName: 'simulacrum-login',
                    message: `successfully logged in with token ${JSON.stringify(token)}`
                  });

                  resolve(token);
               })
               .catch((e) => {
                Cypress.log({
                  name: 'simulacrum-login',
                  displayName: 'simulacrum-login',
                  message: `login failed ${e.message}`
                });

                 reject(e);
               });
  });
});

Cypress.Commands.add('logout', () => {
  return new Cypress.Promise((resolve, reject) => {
    let client = getClientFromSpec(Cypress.spec.name);

    Cypress.log({
      name: 'simulacrum-logout',
      displayName: 'simulacrum-logout',
      message: 'in logout'
    });

    let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

    if(!client || !simulation) {
      Cypress.log({
        name: 'simulacrum-logout',
        displayName: 'simulacrum-logout',
        message: 'no simulation or client'
      });
      resolve();
      return;
    }

    client.destroySimulation(simulation).then(() => {
      Cypress.log({
        name: 'simulacrum-logout',
        displayName: 'simulacrum-logout',
        message: 'simulation destroyed'
      });

      atom.slice(Cypress.spec.name).remove();

      resolve();
    }).catch(e => {

      Cypress.log({
        name: 'simulacrum-logout',
        displayName: 'simulacrum-logout',
        message: `logout failed with ${e.message}`
      });
      reject(e);
    });
  });
});

export { };
