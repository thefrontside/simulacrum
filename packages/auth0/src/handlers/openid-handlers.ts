import type { HttpHandler, Store } from '@simulacrum/server';
import { JWKS } from '../auth/constants';

type OpenIdRoutes =
  | '/jwks.json'
  | '/openid-configuration'

interface OpenIdHandlersOptions {
  url: string;
  store: Store;
}

export const createOpenIdHandlers = ({ url }: OpenIdHandlersOptions): Record<OpenIdRoutes, HttpHandler> => ({
  ['/jwks.json']: function* (_, res) {
    res.json(JWKS);
  },

  ['/openid-configuration']: function* (_, res) {
    res.json({
      issuer: url,
      authorization_endpoint: [url, "authorize"].join('/'),
      token_endpoint: [url, "oauth", "token"].join('/'),
      userinfo_endpoint: [url, "userinfo"].join('/'),
      jwks_uri: [url, ".well-known", "jwks.json"].join('/'),
    });
  }
});
