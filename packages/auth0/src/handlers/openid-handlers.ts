import type { Request, RequestHandler } from "express";
import { JWKS } from "../auth/constants.ts";
import { removeTrailingSlash } from "./url.ts";

type Routes = "/jwks.json" | "/openid-configuration";

export type OpenIdRoutes = `${`/.well-known`}${Routes}`;

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
}

export const createOpenIdHandlers = (
  serviceURL: (request: Request) => string
): Record<OpenIdRoutes, RequestHandler> => {
  return {
    ["/.well-known/jwks.json"]: function (_, res) {
      res.status(200).json(JWKS);
    },

    ["/.well-known/openid-configuration"]: function (req, res) {
      let url = removeTrailingSlash(serviceURL(req));

      res.status(200).json({
        issuer: `${url}/`,
        authorization_endpoint: [url, "authorize"].join("/"),
        token_endpoint: [url, "oauth", "token"].join("/"),
        userinfo_endpoint: [url, "userinfo"].join("/"),
        jwks_uri: [url, ".well-known", "jwks.json"].join("/"),
      });
    },
  };
};
