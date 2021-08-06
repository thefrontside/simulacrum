/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { createClient, Simulation } from '@simulacrum/client';
import { auth0Client } from './auth';

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

const port = process.env.PORT || 4000;

let client = createClient(`http://localhost:${port}`);

Cypress.Commands.add('out', (msg: string) => {
  cy.task('log', msg);
});

Cypress.Commands.add('createSimulation', (options: Auth0ClientOptions) => {
  Cypress.log({
    name: 'auth0-simulator-create=simulation',
  });

  let { domain, client_id, ...auth0Options } = options;

  let port = Number(domain.split(':').slice(-1)[0]);

  return cy.wrap(client.createSimulation("auth0", {
    options: {
      ...auth0Options,
      clientId: client_id,
    },
    services: {
      auth0: {
        port
      }
    }
  }));
});

Cypress.Commands.add('given', { prevSubject: true }, (simulation: Simulation, attrs: Partial<Person> = {}) => {
  Cypress.log({
    name: 'auth0-simulator-given',
  });

  return cy.wrap(client.given(simulation, "person", attrs).then(scenario => scenario.data));
});

Cypress.Commands.add('login', { prevSubject: 'optional' }, (person) => {
  Cypress.log({
    name: 'auth0-simulator-login',
  });

  cy.out(JSON.stringify(person));

  return cy.wrap(auth0Client.getTokenSilently({ ignoreCache: true, currentUser: person.email }));
});

Cypress.Commands.add('logout', () => {
  Cypress.log({
    name: 'auth0-simulator-logout',
  });

  return cy.wrap(auth0Client.logout());
});

export { };
