import type { HttpHandler } from '@simulacrum/server';
import { Options } from 'src/types';
import { JWKS } from '../auth/constants';
import { getServiceUrl } from './get-service-url';

type Routes =
  | '/jwks.json'
  | '/openid-cofiguration'

export type OpenIdRoutes = `${`/.well-known`}${Routes}`

export const createOpenIdHandlers = (options: Options): Record<OpenIdRoutes, HttpHandler> => {
  return {
    ['/.well-known/jwks.json']: function* (_, res) {
      res.json(JWKS);
    },

    ['/.well-known/openid-cofiguration']: function* (_, res) {
      let url = getServiceUrl(options).toString().replace(/\/$/, '');

      res.json({
        issuer: url,
        authorization_endpoint: [url, "authorize"].join('/'),
        token_endpoint: [url, "oauth", "token"].join('/'),
        userinfo_endpoint: [url, "userinfo"].join('/'),
        jwks_uri: [url, ".well-known", "jwks.json"].join('/'),
      });
    }
  };
};
