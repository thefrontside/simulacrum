import type { HttpHandler } from '@simulacrum/server';
import type { Options } from 'src/types';
import { JWKS } from '../auth/constants';
import { getServiceUrl } from './get-service-url';
import { removeTrailingSlash } from './url';

type Routes =
  | '/jwks.json'
  | '/openid-configuration'

export type OpenIdRoutes = `${`/.well-known`}${Routes}`

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
}

export const createOpenIdHandlers = (options: Options): Record<OpenIdRoutes, HttpHandler> => {
  return {
    ['/.well-known/jwks.json']: function* (_, res) {
      res.json(JWKS);
    },

    ['/.well-known/openid-configuration']: function* (_, res) {
      let url = removeTrailingSlash(getServiceUrl(options).toString());

      res.json({
        issuer: `${url}/`,
        authorization_endpoint: [url, "authorize"].join('/'),
        token_endpoint: [url, "oauth", "token"].join('/'),
        userinfo_endpoint: [url, "userinfo"].join('/'),
        jwks_uri: [url, ".well-known", "jwks.json"].join('/'),
      });
    },
  };
};
