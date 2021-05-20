import { HttpHandler, Store } from '@simulacrum/server';
import { decode } from 'html-entities';
import { expiresAt } from './auth/date';
import { createAuthJWT, createJsonWebToken } from './auth/jwt';
import { loginView } from './views/login';
import { userNamePasswordForm } from './views/usernamePassword';

const nonceMap: Record<
  string,
  {
    username: string;
    nonce: string;
  }
> = {};

export const createHandlers = ({ url, scope, port }: { store: Store, url: string, scope: string, port: number }): Record<string, HttpHandler> => ({
  heartbeat: function *(_, res) {
    res.status(200).json({ ok: true });
  },

  login: function* (req, res) {
    let html = loginView({ port, scope });

    res.set("Content-Type", "text/html");

    res.status(200).send(Buffer.from(html));
  },

  loginHandler: function* (req, res) {
    let { username, nonce } = req.body;

    nonceMap[nonce] = {
      username,
      nonce,
    };

    res.status(200).send(userNamePasswordForm(req.body));
  },

  token: function* (req, res) {
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
  }
} as const);

