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
      login({ currentUser }: { currentUser: string }): Promise<Token>
    }
  }
}

Cypress.Commands.add('login', async ({ currentUser }: {currentUser: string}) => {
  Cypress.log({
    name: 'loginViaAuth0',
  });

  await auth0Client.getTokenSilently({ ignoreCache: true, currentUser });
});

export {};
