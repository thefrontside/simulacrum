import type { Auth0SDKs } from '../types';

interface Config {
  sessionCookieName: string;
  cookieSecret: string;
  audience: string;
  connection: string;
  scope: string;
  clientSecret: string;
  clientID: string;
  domain: string;
  sdk: Auth0SDKs
}

export function getConfig(): Config {
  let sessionCookieName = Cypress.env('auth0SessionCookieName') ?? 'appSession';
  let cookieSecret = Cypress.env('auth0CookieSecret');
  let audience = Cypress.env('audience');
  let connection = Cypress.env('connection') ?? 'Username-Password-Authentication';
  let scope = Cypress.env('scope') ?? 'openid profile email offline_access';
  let clientSecret = Cypress.env('auth0ClientSecret');
  let clientID = Cypress.env('clientID') ?? 'YOUR_AUTH0_CLIENT_ID';
  let domain = Cypress.env('domain') ?? 'localhost:4400';
  let sdk = (Cypress.env('AUTH0_SDK') ?? 'auth0_react') as Auth0SDKs;

  return {
    sessionCookieName,
    cookieSecret,
    audience,
    connection,
    scope,
    clientSecret,
    clientID,
    domain,
    sdk
  };
}

export function getAuth0Config() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let { sdk, cookieSecret, sessionCookieName, ...auth0Options } = getConfig();

  return auth0Options;
}
