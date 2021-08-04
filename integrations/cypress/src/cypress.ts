/* eslint-disable @typescript-eslint/no-namespace */
/// <reference types="cypress" />
import { bigtestGlobals, RunnerState } from '@bigtest/globals';
import { Interaction, ReadonlyInteraction } from '@bigtest/interactor';

interface Token {
  access_token: Record<string, any>;
  expires_in: number;
  id_token: Record<string, any>
}

declare global {
  namespace Cypress {
    interface Chainable {
      login({ currentUser }: { currentUser: string }): Promise<Token>
    }
  }
}

Cypress.Commands.add('login', async ({currentUser}: {currentUser: string}) => {
  Cypress.log({
    name: 'loginViaAuth0',
  });

  await auth0Client.getTokenSilently({ ignoreCache: true, currentUser });
});