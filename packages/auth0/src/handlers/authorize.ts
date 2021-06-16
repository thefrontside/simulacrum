import type { Request, Response } from 'express';
import { assert } from 'assert-ts';
import { Options, QueryParams } from '../types';
import querystring from "querystring";
import { encode } from "base64-url";
import { webMessage } from '../views/web-message';
import { Middleware } from '@simulacrum/server';

export const createAuthorizeHandlers = (options: Options): Record<'webMessageResponse' | 'loginRedirect', Middleware> => ({
  webMessageResponse: function *(req: Request, res: Response) {
    assert(!!req.session, "no session");

    let username = req.session.username;

    assert(!!username, `no username in authorise`);

    res.set("Content-Type", "text/html");

    let {
      nonce,
      state,
      redirect_uri,
    } = req.query as QueryParams;

    let message = webMessage({
      code: encode(`${nonce}:${username}`),
      state,
      redirect_uri,
      nonce,
    });

    res.status(200).send(Buffer.from(message));
    return;
  },

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
      `/login?${querystring.stringify({
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
