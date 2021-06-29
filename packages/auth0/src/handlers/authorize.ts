import type { Request, Response } from 'express';
import { Options, QueryParams } from '../types';
import { stringify } from "querystring";
import { Middleware } from '@simulacrum/server';

export const createAuthorizeHandlers = (options: Options): Record<'loginRedirect', Middleware> => ({
  loginRedirect: function* (req: Request, res: Response) {
    let {
      client_id,
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
        client: client_id,
        protocol: "oauth2",
        scope,
        response_type,
        response_mode,
        nonce,
        code_challenge,
        code_challenge_method,
        auth0Client,
        audience: options.audience,
      })}`
    );
  }
});
