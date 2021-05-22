import type { HttpHandler, Store } from '@simulacrum/server';
import { JWKS } from '../auth/constants';

type Routes =
  | '/jwks.json'
  | '/openid-cofiguration'

 type OpenIdRoutes = `${`/.well-known`}${Routes}`

interface OpenIdHandlersOptions {
  url: string;
  store: Store;
}

export const createOpenIdHandlers = ({ url }: OpenIdHandlersOptions): Record<OpenIdRoutes, HttpHandler> => ({
  ['/.well-known/jwks.json']: function* (_, res) {
    res.json(JWKS);
  },

  ['/.well-known/openid-cofiguration']: function* (_, res) {
    res.json({
      issuer: url,
      authorization_endpoint: [url, "authorize"].join('/'),
      token_endpoint: [url, "oauth", "token"].join('/'),
      userinfo_endpoint: [url, "userinfo"].join('/'),
      jwks_uri: [url, ".well-known", "jwks.json"].join('/'),
    });
  }
});
