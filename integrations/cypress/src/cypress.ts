/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />

import { auth0Client } from './auth';

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
      login({ currentUser }: { currentUser: string }): Promise<Token>;
      logout(): Promise<void>;
    }
  }
}

Cypress.Commands.add('login', async ({ currentUser }: {currentUser: string}) => {
  Cypress.log({
    name: 'auth0-simulator-login',
  });

  await auth0Client.getTokenSilently({ ignoreCache: true, currentUser });
});

Cypress.Commands.add('logout', async () => {
  Cypress.log({
    name: 'auth0-simulator-logout',
  });

  await auth0Client.logout();
});

export {};
