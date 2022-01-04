import type { AuthorizeOptions, AuthOptions } from 'auth0-js';
import { WebAuth } from 'auth0-js';

const Auth0ConfigDefaults: Pick<AuthorizeOptions, 'connection' | 'scope'> = {
  connection: 'Username-Password-Authentication',
  scope: 'openid profile email',
};


const Auth0Config: AuthOptions = {
  ...Auth0ConfigDefaults,
  audience: Cypress.env('audience'),
  clientID: Cypress.env('client_id'),
  domain: Cypress.env('domain'),
  scope: Cypress.env('scope'),
};

export const auth = new WebAuth(Auth0Config);
