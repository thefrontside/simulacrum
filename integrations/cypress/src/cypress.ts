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
      login({ currentUser }: { currentUser: string }): Chainable<Token>;
      logout(): Chainable<void>;
      given(simulation: Simulation, attrs?: Partial<Person>): Chainable<Person>
    }
  }
}

const port = process.env.PORT || 4000;

let client = createClient(`http://localhost:${port}`);

Cypress.Commands.add('createSimulation', (options: Auth0ClientOptions) => {
  Cypress.log({
    name: 'auth0-simulator-create=simulation',
  });

  let { domain, client_id, ...auth0Options } = options;

  let port = Number(domain.split(':').slice(-1)[0]);

  cy.log(JSON.stringify({ domain, client_id, ...auth0Options }));

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

Cypress.Commands.add('given', (simulation: Simulation, attrs: Partial<Person> = {}) => {
  Cypress.log({
    name: 'auth0-simulator-given',
  });

  return cy.wrap(client.given(simulation, "person", attrs).then(scenario => scenario.data));
});

Cypress.Commands.add('login', ({ currentUser }: { currentUser: string }) => {
  Cypress.log({
    name: 'auth0-simulator-login',
  });

  return cy.wrap(auth0Client.getTokenSilently({ ignoreCache: true, currentUser }));
});

Cypress.Commands.add('logout', () => {
  Cypress.log({
    name: 'auth0-simulator-logout',
  });

  return cy.wrap(auth0Client.logout());
});

export { };
