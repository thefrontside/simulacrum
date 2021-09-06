/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { Client, createClient, Simulation } from '@simulacrum/client';
import { auth0Client } from './auth';
import { assert } from 'assert-ts';
import { createAtom } from '@effection/atom';

type TestState = Record<string, {
  client: Client,
  simulation: Simulation
}>;

const atom = createAtom<TestState>({});

export interface Person { email: string; password: string }

interface Token {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  access_token: Record<string, any>;
  expires_in: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id_token: Record<string, any>
}

declare global {
  namespace Cypress {
    interface Chainable {
      createSimulation(options: Auth0ClientOptions): Chainable<Simulation>;
      login(person?: Person): Chainable<Token>;
      logout(): Chainable<void>;
      given(attrs?: Partial<Person>): Chainable<Person>;
      out<S = unknown>(msg: string): Chainable<S>
    }
  }
}

const ClientPort = process.env.PORT || 4000;

function getClientFromSpec (spec: string) {
  let client: Client;

  if(typeof atom.slice(spec).get() === 'undefined') {
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

      resolve(simulation);
    }).catch(reject);
  });
});

  Cypress.Commands.add('given', { prevSubject: true }, (simulation: Simulation, attrs: Partial<Person> = {}) => {
    return new Cypress.Promise((resolve, reject) => {
      let client = getClientFromSpec(Cypress.spec.name);

      assert(!!client && typeof client.given === 'function', 'no validclient in given');

      client.given(simulation, "person", attrs)
        .then((scenario) => {
          resolve(scenario.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
});

Cypress.Commands.add('login', { prevSubject: 'optional' }, (person) => {
  return new Cypress.Promise((resolve, reject) => {
    assert(!!person && typeof person.email !== 'undefined', `no scenario in login`);

    auth0Client.getTokenSilently({ ignoreCache: true, currentUser: person.email })
               .then(resolve)
               .catch(reject);
  });
});

Cypress.Commands.add('logout', () => {
  auth0Client.logout();
  let client = getClientFromSpec(Cypress.spec.name);
  let simulation = atom.slice(Cypress.spec.name, 'simulation').get();

  assert(typeof simulation !== 'undefined');

  return new Cypress.Promise((resolve, reject) => {
    client.destroySimulation(simulation).then(resolve).catch(reject);
  });
});


export { };
