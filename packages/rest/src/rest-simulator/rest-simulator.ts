import type { Simulator, Service } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import morgan from 'morgan';
import jwksRsa from 'jwks-rsa';
import helmet from "helmet";
import jwt from "express-jwt";

interface RestOptions {
  port: number
}

const checkJwt = jwt({
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

export const restService = ({ port }: RestOptions): Service => {
  return {
    protocol: 'http',
    port,
    app: createHttpApp().use(morgan("dev")).use(helmet()).use(checkJwt).get("/api/external", function* (_, res) {
      res.send({
        msg: "Your access token was successfully validated!",
      });
    })
  };
};

const restSimulator: Simulator<RestOptions> = (store, options: RestOptions) => ({

});
