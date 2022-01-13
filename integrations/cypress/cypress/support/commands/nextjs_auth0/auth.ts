import type { AuthorizeOptions, AuthOptions } from 'auth0-js';
import { WebAuth } from 'auth0-js';
import { getConfig } from '../../utils/config';

const Auth0ConfigDefaults: Pick<AuthorizeOptions, 'connection' | 'scope'> = {
  connection: 'Username-Password-Authentication',
  scope: 'openid profile email',
};

const { audience, clientID, domain, scope } = getConfig();

const Auth0Config: AuthOptions = {
  ...Auth0ConfigDefaults,
  audience,
  clientID,
  domain,
  scope,
  _sendTelemetry: false,
};

export const auth = new WebAuth(Auth0Config);
