import { HttpHandler, Store } from '@simulacrum/server';
import { assert } from 'assert-ts';
import { decode, encode } from 'html-entities';
import { expiresAt } from './auth/date';
import { createAuthJWT, createJsonWebToken } from './auth/jwt';
import { loginView } from './views/login';
import { userNamePasswordForm } from './views/username-password';
import querystring from "querystring";
import { webMessage } from './views/web-message';
import { Auth0QueryParams } from './types';

// TODO: if we use the session then fix the types
declare global{
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
      interface Request {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          session: any;
      }
  }
}

const nonceMap: Record<
  string,
  {
    username: string;
    nonce: string;
  }
> = {};

export type Routes =
  | '/heartbeat'
  | '/authorize'
  | '/login'
  | '/usernamepassword/login'
  | '/u/login'
  | '/login/callback'
  | '/oauth/token'
  | '/v2/logout';

interface HandlerOptions {
  store: Store;
  url: string;
  scope: string;
  port: number
  audience: string;
  clientId: string;
  tenant: string;
}

export const createHandlers = ({ url, scope, port, audience }: HandlerOptions): Record<Routes, HttpHandler> => ({
  ['/heartbeat']: function *(_, res) {
    res.status(200).json({ ok: true });
  },

  ['/authorize']: function* (req, res) {
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
      contactEmail,
    } = req.query as Auth0QueryParams & { contactEmail?: string };

    assert(!!req.session, "no session");

    if (typeof contactEmail !== "undefined") {
      req.session.username = contactEmail;
    }

    res.removeHeader("X-Frame-Options");

    if (response_mode === "web_message") {
      let username = req.session.username;

      assert(!!username, `no username in authorise`);

      res.set("Content-Type", "text/html");

      let message = webMessage({
        code: encode(`${nonce}:${username}`),
        state,
        redirect_uri,
        nonce,
      });

      res.status(200).send(Buffer.from(message));
      return;
    }

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
        audience,
      })}`
    );
  },

  ['/login']: function* (req, res) {
    let html = loginView({ port, scope });

    res.set("Content-Type", "text/html");

    res.status(200).send(Buffer.from(html));
  },

  ['/usernamepassword/login']: function* (req, res) {
    let { username, nonce } = req.body;

    assert(!!req.session, "no session");

    req.session.username = username;

    nonceMap[nonce] = {
      username,
      nonce,
    };

    res.status(200).send(userNamePasswordForm(req.body));
  },

  ['/login/callback']: function* (req, res) {
    let wctx = JSON.parse(req.body.wctx);

    let { redirect_uri, state, nonce } = wctx;

    assert(!!req.session, "no session");

    let encodedNonce = encode(`${nonce}:${req.session.username}`);

    let qs = querystring.stringify({ code: encodedNonce, state, nonce });

    let routerUrl = `${redirect_uri}?${qs}`;

    return res.status(302).redirect(routerUrl);
  },

  ['/u/login']: function* (req, res) {
    res.status(200).redirect('/login');
  },

  ['/oauth/token']: function* (req, res) {
    let { client_id, code } = req.body;

    let [nonce, username] = decode(code).split(":");

    if (!username) {
      res.status(400).send(`no nonce in store for ${code}`);
      return;
    }

    let idToken = createJsonWebToken({
      alg: "RS256",
      typ: "JWT",
      iss: `${url}/`,
      exp: expiresAt(),
      iat: Date.now(),
      mail: username,
      aud: client_id,
      sub: "subject field",
      nonce,
    });

    res.status(200).json({
      access_token: createAuthJWT(url),
      id_token: idToken,
      scope,
      expires_in: 86400,
      token_type: "Bearer",
    });
  },

  ['/v2/logout']: function *(req, res) {
    req.session = null;

    assert(typeof req.query.returnTo === 'string', `unexpected ${req.query.returnTo} for returnTo`);

    res.redirect(req.query.returnTo);
  }
} as const);

