import type { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { Auth0Client } from '@auth0/auth0-spa-js';

const Auth0ConfigDefaults: Pick<Auth0ClientOptions, 'connection' | 'scope'> = {
  connection: 'Username-Password-Authentication',
  scope: 'openid profile email',
};

const Auth0ConfigFixed: Pick<Auth0ClientOptions, 'cacheLocation' | 'useRefreshTokens'> = {
  cacheLocation: 'localstorage',
  useRefreshTokens: true
};

const Auth0Config: Auth0ClientOptions = {
  ...Auth0ConfigDefaults,
  audience: Cypress.env('audience'),
  client_id: Cypress.env('clientId'),
  connection: Cypress.env('connection'),
  domain: Cypress.env('domain'),
  scope: Cypress.env('scope'),
  ...Auth0ConfigFixed
};

export const auth0Client = new Auth0Client(Auth0Config);
