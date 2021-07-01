import { HttpHandler, Person, Store } from '@simulacrum/server';
import { Options, QueryParams, ResponseModes } from '../types';
import { createAuthorizeHandlers } from './authorize';
import { loginView } from '../views/login';
import { assert } from 'assert-ts';
import { stringify } from 'querystring';
import { encode } from "base64-url";
import { userNamePasswordForm } from '../views/username-password';

export type Routes =
  | '/heartbeat'
  | '/authorize'
  | '/login'
  | '/usernamepassword/login'
  | '/login/callback'
  type Predicate<T> = (this: void, value: [string, T], index: number, obj: [string, T][]) => boolean;

const createPersonQuery = (store: Store) => (predicate: Predicate<Person>) => {
  let people = store.slice('people').get() ?? [];

  let entry = Object.entries(people as unknown as Person[]).find(predicate);

  if(!entry) {
    return undefined;
  }else {
    let [,person] = entry;

    return person;
  }
};

export const createAuth0Handlers = (options: Options): Record<Routes, HttpHandler> => {
  let { loginRedirect } = createAuthorizeHandlers(options);

  let { port, audience, scope, store, clientId } = options;
  let personQuery = createPersonQuery(store);

  return {
    ['/heartbeat']: function *(_, res) {
      res.status(200).json({ ok: true });
    },

    ['/authorize']: function *(req, res) {
      let responseMode = req.query.response_mode as ResponseModes;

      switch(responseMode) {
        case 'query':
          yield loginRedirect(req, res);
          break;
        default:
          throw new Error(`unknown response_mode ${responseMode}`);
      }
    },

    ['/login']: function* (req, res) {
      let { redirect_uri } = req.query as QueryParams;

      assert(!!port, `no port assigned`);
      assert(!!clientId, `no clientId assigned`);

      let html = loginView({
        port,
        scope,
        redirectUri: redirect_uri,
        clientId,
        audience,
        loginFailed: false
      });

      res.set("Content-Type", "text/html");

      res.status(200).send(Buffer.from(html));
    },

    ['/usernamepassword/login']: function* (req, res) {
      let { username, nonce, password } = req.body;

      assert(!!username, 'no username in /usernamepassword/login');
      assert(!!nonce, 'no nonce in /usernamepassword/login');
      assert(!!req.session, "no session");

      let user = personQuery(([, person]) => person.email?.toLowerCase() === username.toLowerCase() && person.password === password);

      if(!user) {
        let { redirect_uri } = req.query as QueryParams;

        assert(!!port, `no port assigned`);
        assert(!!clientId, `no clientId assigned`);

        let html = loginView({
          port,
          scope,
          redirectUri: redirect_uri,
          clientId,
          audience,
          loginFailed: true
        });

        res.set("Content-Type", "text/html");

        res.status(400).send(html);
        return;
      }

      req.session.username = username;

      store.slice('auth0').set({
        [nonce]: {
          username,
          nonce
        }
      });

      res.status(200).send(userNamePasswordForm(req.body));
    },

    ['/login/callback']: function* (req, res) {
      let wctx = JSON.parse(req.body.wctx);

      let { redirect_uri, state, nonce } = wctx;

      let { username } = store.slice('auth0', nonce).get();

      let encodedNonce = encode(`${nonce}:${username}`);

      let qs = stringify({ code: encodedNonce, state, nonce });

      let routerUrl = `${redirect_uri}?${qs}`;

      return res.status(302).redirect(routerUrl);
    },
  };
};

