import type { HttpHandler, Middleware, Person, Store } from '@simulacrum/server';
import type { AccessTokenPayload, IdTokenData, Options, QueryParams, ResponseModes } from '../types';
import { createLoginRedirectHandler } from './login-redirect';
import { createWebMessageHandler } from './web-message';
import { loginView } from '../views/login';
import { assert } from 'assert-ts';
import { stringify } from 'querystring';
import { decode, encode } from "base64-url";
import { userNamePasswordForm } from '../views/username-password';
import { epochTime, expiresAt } from '../auth/date';
import { createJsonWebToken } from '../auth/jwt';
import { getServiceUrl } from './get-service-url';
import { createRulesRunner } from '../rules/rules-runner';
import type { RuleUser } from '../rules/types';
import { decode as decodeToken } from 'jsonwebtoken';

export type Routes =
  | '/heartbeat'
  | '/authorize'
  | '/login'
  | '/usernamepassword/login'
  | '/login/callback'
  | '/oauth/token'
  | '/v2/logout'
  | '/userinfo'

type Predicate<T> = (this: void, value: [string, T], index: number, obj: [string, T][]) => boolean;

const getServiceUrlFromOptions = (options: Options) => {
  let service = options.services.get().find(({ name }) => name === 'auth0' );
  assert(!!service, `did not find auth0 service in set of running services`);

  return new URL(service.url);
};

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
  let { audience, scope, store, clientID, rulesDirectory } = options;
  let personQuery = createPersonQuery(store);
  let rulesRunner = createRulesRunner(rulesDirectory);

  let authorizeHandlers: Record<ResponseModes, Middleware> = {
    query: createLoginRedirectHandler(options),
    web_message: createWebMessageHandler()
  };


  return {
    ['/heartbeat']: function *(_, res) {
      res.status(200).json({ ok: true });
    },

    ['/authorize']: function *(req, res) {
      let currentUser = req.query.currentUser as string | undefined;

      assert(!!req.session, "no session");


      if(currentUser) {
        // the request is a silent login.
        // We fake an existing login by
        // adding the user to the session
        req.session.username = currentUser;
      }

      let responseMode = (req.query.response_mode ?? 'query') as ResponseModes;

      assert(['query', 'web_message'].includes(responseMode), `unknown response_mode ${responseMode}`);

      let handler = authorizeHandlers[responseMode];

      yield handler(req, res);
    },

    ['/login']: function* (req, res) {
      let { redirect_uri } = req.query as QueryParams;

      let url = getServiceUrl(options);

      assert(!!clientID, `no clientID assigned`);

      let html = loginView({
        domain: url.host,
        scope,
        redirectUri: redirect_uri,
        clientID,
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

        let url = getServiceUrlFromOptions(options);

        assert(!!clientID, `no clientID assigned`);

        let html = loginView({
          domain: url.host,
          scope,
          redirectUri: redirect_uri,
          clientID,
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

      res.status(302).redirect(routerUrl);
    },

    ['/oauth/token']: function* (req, res) {
      let { code, grant_type } = req.body;

      let user: Person | undefined;
      let nonce: string | undefined;
      let username: string;
      let password: string | undefined;

      if (grant_type === 'password') {
        username = req.body.username;
        password = req.body.password;
      } else {
        assert(typeof code !== 'undefined', 'no code in /oauth/token');

        [nonce, username] = decode(code).split(":");
      }

      if (!username) {
        res.status(400).send(`no nonce in store for ${code}`);
        return;
      }

      user = personQuery(([, person]) => {
        assert(!!person.email, `no email defined on person scenario`);

        let valid = person.email.toLowerCase() === username.toLowerCase();

        if(typeof password === 'undefined') {
          return valid;
        } else {
          return valid && password === person.password;
        }
      });

      if(!user) {
        res.status(401).send('Unauthorized');
        return;
      }

      let url = getServiceUrlFromOptions(options).toString();

      assert(!!clientID, 'no clientID in options');

      let idTokenData: IdTokenData = {
        alg: "RS256",
        typ: "JWT",
        iss: url,
        exp: expiresAt(),
        iat: epochTime(),
        email: username,
        aud: clientID,
        sub: user.id,
      };

      if(typeof nonce !== 'undefined') {
        idTokenData.nonce = nonce;
      }

      let userData = {} as RuleUser;
      let context = { clientID, accessToken: { scope }, idToken: idTokenData };

      rulesRunner(userData, context);

      let idToken = createJsonWebToken({ ...userData, ...context.idToken });

      let accessToken: AccessTokenPayload = {
        aud: audience,
        sub: idTokenData.sub,
        iat: epochTime(),
        iss: idTokenData.iss,
        exp: idTokenData.exp,
        ...context.accessToken
      };

      res.status(200).json({
        access_token: createJsonWebToken(accessToken),
        id_token: idToken,
        expires_in: 86400,
        token_type: "Bearer",
      });
    },

    ['/v2/logout']: function *(req, res) {
      req.session = null;

      let returnToUrl = req.query.returnTo ?? req.headers.referer;

      assert(typeof returnToUrl === 'string', `no logical returnTo url`);

      res.redirect(returnToUrl);
    },

    ['/userinfo']: function* (req, res) {
      let authorizationHeader = req.headers.authorization;

      assert(!!authorizationHeader, 'no authorization header');

      let [, token] = authorizationHeader.split(' ');

      let { sub } = decodeToken(token, { json: true }) as { sub: string };

      let user = personQuery(([, person]) => {
        assert(!!person.id, `no email defined on person scenario`);

        return person.id === sub;
      });

      assert(!!user, 'no user in /userinfo');

      let userinfo = {
        sub,
        name: user.name,
        given_name: user.name,
        family_name: user.name,
        email: user.email,
        email_verified: true,
        locale: 'en',
        hd: 'okta.com'
       };

      res.status(200).json(userinfo);
    }
  };
};
