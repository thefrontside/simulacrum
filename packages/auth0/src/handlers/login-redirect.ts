import type { Request, Response, RequestHandler } from 'express';
import type { Auth0Configuration, QueryParams } from '../types';
import { stringify } from "querystring";

export const createLoginRedirectHandler = (options: Auth0Configuration): RequestHandler =>
  function loginRedirect (req: Request, res: Response) {
    let {
      client_id,
      audience,
      redirect_uri,
      scope,
      state,
      nonce,
      response_mode,
      code_challenge,
      code_challenge_method,
      auth0Client,
      response_type,
    } = req.query as QueryParams;

    res.status(302).redirect(
      `/login?${stringify({
        state,
        redirect_uri,
        client: client_id || options.clientID,
        protocol: "oauth2",
        scope,
        response_type,
        response_mode,
        nonce,
        code_challenge,
        code_challenge_method,
        auth0Client,
        audience: audience || options.audience,
      })}`
    );
  };
