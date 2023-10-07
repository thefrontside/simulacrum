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
  auth0RunningPort: number;
  auth0SimulatorPort: number;
}

export function getConfig(): Config {
  let auth0RunningPort = Cypress.env('AUTH0_RUNNING_PORT') ?? 4400;
  return {
    auth0RunningPort,
    auth0SimulatorPort: Cypress.env('AUTH0_SIMULATOR_PORT') ?? 4000,
    sdk : Cypress.env('AUTH0_SDK') ?? 'auth0_react',
    // Auth0 sdk configuration
    audience : Cypress.env('AUTH0_AUDIENCE'),
    scope : Cypress.env('AUTH0_SCOPE') ?? 'openid profile email offline_access',
    connection : Cypress.env('AUTH0_CONNECTION') ?? 'Username-Password-Authentication',
    clientID : Cypress.env('AUTH0_CLIENT_ID') ?? 'YOUR_AUTH0_CLIENT_ID',
    clientSecret : Cypress.env('AUTH0_CLIENT_SECRET'),
    sessionCookieName : Cypress.env('AUTH0_SESSION_COOKIE_NAME') ?? 'appSession',
    cookieSecret : Cypress.env('AUTH0_COOKIE_SECRET'),
    // TODO: this breaks non-localhost custom domains as the Auth0 domain, but that seems to not be possible anyway in @simulacrum/auth0-simulator
    domain : `localhost:${auth0RunningPort}`,
  };
}

export function configValidation(config: Config): void {

  function isConfigKeyValid(key: keyof Config): boolean {
    return config.hasOwnProperty(key) && config[key] !== '';
  }

  assert.isOk(isConfigKeyValid('sdk'), 'sdk is a required option in the config');
  assert.isOk(isConfigKeyValid('clientID'), 'clientID is a required option in the config');
  assert.isOk(isConfigKeyValid('scope'), 'scope is a required option in the config');
}
