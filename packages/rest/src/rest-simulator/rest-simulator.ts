import type { Simulator, Service } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import morgan from 'morgan';
import jwksRsa from 'jwks-rsa';
import helmet from "helmet";
import jwt from "express-jwt";
import { OauthConfig } from 'src/types';


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

const restService = (authConfig: OauthConfig) => (): Service => {
  return {
    protocol: 'http',
    port: authConfig.port,
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

export const createRestSimulator = (authConfig: OauthConfig): Simulator => () => ({
    services: { rest: restService(authConfig)() },
    scenarios: {}
});
