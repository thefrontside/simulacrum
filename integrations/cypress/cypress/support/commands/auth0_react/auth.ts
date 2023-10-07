import type { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import { Auth0Client } from '@auth0/auth0-spa-js';
import { getConfig } from "../../utils";

const Auth0ConfigDefaults: Pick<Auth0ClientOptions, 'connection' | 'scope'> = {
  connection: 'Username-Password-Authentication',
  scope: 'openid profile email',
};

const Auth0ConfigFixed: Pick<Auth0ClientOptions, 'cacheLocation' | 'useRefreshTokens'> = {
  cacheLocation: 'localstorage',
  useRefreshTokens: true
};


export function Auth0ReactConfig() {
  let config = getConfig();
  return new Auth0Client({
    ...Auth0ConfigDefaults,
    audience: config.audience,
    client_id: config.clientID,
    domain: config.domain,
    scope: config.scope,
    ...Auth0ConfigFixed
  });
}
