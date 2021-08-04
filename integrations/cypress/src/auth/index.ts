import { Auth0Client } from '@auth0/auth0-spa-js';

const Auth0ConfigDefaults = {
  connection: 'Username-Password-Authentication',
  scope: 'openid profile email',
};

const Auth0ConfigFixed = {
  cacheLocation: 'localstorage',
  useRefreshTokens: true
};

const Auth0Config = {
  ...Auth0ConfigDefaults,
  audience: Cypress.env('audience'),
  client_id: Cypress.env('clientId'),
  connection: Cyrpess.env('connection'),
  domain: Cypress.env('domain'),
  scope: Cypress.env('scope'),
  ...Auth0ConfigFixed
};

export const auth0Client = new Auth0Client(Auth0Config);
