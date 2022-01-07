/// <reference types="cypress" />

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


import './commands'