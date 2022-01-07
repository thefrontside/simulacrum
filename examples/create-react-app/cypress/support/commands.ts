import configJson from "../../src/auth_config.json";
import { Auth0Client } from '@auth0/auth0-spa-js';

const auth0Client = new Auth0Client({
  audience: configJson.audience,
  client_id: configJson.clientId,
  connection: 'Username-Password-Authentication',
  domain: configJson.domain,
  scope: 'openid profile email',
  cacheLocation: 'localstorage',
  useRefreshTokens: true
});

Cypress.Commands.add('login', async ({ currentUser }: {currentUser: string}) => {
  Cypress.log({
    name: 'auth0-simulator-login',
  });

  await auth0Client.getTokenSilently({ ignoreCache: true, currentUser });
});