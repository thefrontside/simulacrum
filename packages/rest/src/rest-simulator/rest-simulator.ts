import type { Simulator, Service } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import morgan from 'morgan';
import jwksRsa from 'jwks-rsa';
import helmet from "helmet";
import jwt from "express-jwt";
import { OauthConfig } from 'src/types';

interface RestOptions {
  port: number
}

const checkJwt = (authConfig: OauthConfig) => jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
  }),

  audience: authConfig.audience,
  issuer: `https://${authConfig.domain}/`,
  algorithms: ["RS256"],
});

export const restService = (authConfig: OauthConfig) => ({ port }: RestOptions): Service => {
  return {
    protocol: 'http',
    port,
    app: createHttpApp()
          .use(morgan("dev"))
          .use(helmet())
          .use(checkJwt(authConfig))
          .get("/api/external", function* (_, res) {
      res.send({
        msg: "Your access token was successfully validated!",
        });
      })
  };
};

export const restSimulator = (authConfig: OauthConfig): Simulator<RestOptions> => (store, options: RestOptions) => ({
  services: { rest: restService(authConfig)(options) },
  scenarios: {}
});
