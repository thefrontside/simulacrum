import type { Person } from '@simulacrum/server';
import type { AccessTokenPayload, Auth0Configuration, IdTokenData, QueryParams, ResponseModes } from '../types';
import type { RequestHandler } from 'express';
import { createLoginRedirectHandler } from './login-redirect';
import { createWebMessageHandler } from './web-message';
import { loginView } from '../views/login';
import { assert } from 'assert-ts';
import { stringify } from 'querystring';
import { decode, encode } from "base64-url";
import { userNamePasswordForm } from '../views/username-password';
import { epochTime, expiresAt } from '../auth/date';
import { createJsonWebToken } from '../auth/jwt';
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

type Predicate<T> = (this: void, value: T, index: number, obj: T[]) => boolean;

export type AuthSession = { username: string, nonce: string };

export interface Auth0Store {
  get(nonce: string): AuthSession;
  set(nonce: string, session: AuthSession): void;
}

const createPersonQuery = (people: Iterable<Person>) => (predicate: Predicate<Person>) => {
  return [...people].find(predicate);
};

export const createAuth0Handlers = (store: Auth0Store, people: Iterable<Person>, serviceURL: () => URL, options: Auth0Configuration): Record<Routes, RequestHandler> => {
  let { audience, scope, clientID, rulesDirectory } = options;
  let personQuery = createPersonQuery(people);
  let rulesRunner = createRulesRunner(rulesDirectory);

  let authorizeHandlers: Record<ResponseModes, RequestHandler> = {
    query: createLoginRedirectHandler(options),
    web_message: createWebMessageHandler()
  };


  return {
    ['/heartbeat']: function (_, res) {
      res.status(200).json({ ok: true });
    },

    ['/authorize']: function(req, res, next) {
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

      handler(req, res, next);
    },

    ['/login']: function(req, res) {
      let {
        client_id: query_client_id,
        audience: query_audience,
        redirect_uri,
      } = req.query as QueryParams;
      let response_client_id = query_client_id || clientID;
      let response_audience = query_audience || audience;
      assert(!!response_client_id, `no clientID assigned`);

      let html = loginView({
        domain: serviceURL().host,
        scope,
        redirectUri: redirect_uri,
        clientID: response_client_id,
        audience: response_audience,
        loginFailed: false
      });

      res.set("Content-Type", "text/html");

      res.status(200).send(Buffer.from(html));
    },

    ['/usernamepassword/login']: function(req, res) {
      let { username, nonce, password } = req.body;

      assert(!!username, 'no username in /usernamepassword/login');
      assert(!!nonce, 'no nonce in /usernamepassword/login');
      assert(!!req.session, "no session");

      let user = personQuery((person) => person.email?.toLowerCase() === username.toLowerCase() && person.password === password);

      if(!user) {
        let { redirect_uri } = req.query as QueryParams;

        assert(!!clientID, `no clientID assigned`);

        let html = loginView({
          domain: serviceURL().host,
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

      store.set(nonce, { username, nonce });

      res.status(200).send(userNamePasswordForm(req.body));
    },

    ['/login/callback']: function(req, res) {
      let wctx = JSON.parse(req.body.wctx);

      let { redirect_uri, state, nonce } = wctx;

      let { username } = store.get(nonce);

      let encodedNonce = encode(`${nonce}:${username}`);

      let qs = stringify({ code: encodedNonce, state, nonce });

      let routerUrl = `${redirect_uri}?${qs}`;

      res.status(302).redirect(routerUrl);
    },

    ['/oauth/token']: async function (req, res) {
      let { code, grant_type } = req.body;

      let user: Person | undefined;
      let nonce: string | undefined;
      let username: string;
      let password: string | undefined;
      let response_client_id: string;
      let response_audience: string;

      if (grant_type === 'password') {
        username = req.body.username;
        password = req.body.password;
        response_client_id = req?.body?.client_id as string || clientID;
        response_audience = req?.body?.audience as string|| audience;
      } else {
        assert(typeof code !== 'undefined', 'no code in /oauth/token');
        response_client_id = clientID;
        response_audience = audience;

        [nonce, username] = decode(code).split(":");
      }

      if (!username) {
        res.status(400).send(`no nonce in store for ${code}`);
        return;
      }

      user = personQuery((person) => {
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

      assert(!!response_client_id, 'no clientID in options');

      let idTokenData: IdTokenData = {
        alg: "RS256",
        typ: "JWT",
        iss: serviceURL().toString(),
        exp: expiresAt(),
        iat: epochTime(),
        email: username,
        aud: response_client_id,
        sub: user.id,
      };

      if(typeof nonce !== 'undefined') {
        idTokenData.nonce = nonce;
      }

      let userData = {
        name: req?.body?.name,
        email: req?.body?.email,
        user_id: req?.body?.id,
        nickname: req?.body?.nickname,
        picture: req?.body?.picture,
        identities: req?.body?.identities,
      } as RuleUser;
      let context = { clientID: response_client_id, accessToken: { scope }, idToken: idTokenData };

      await rulesRunner(userData, context);

      let idToken = createJsonWebToken({ ...userData, ...context.idToken });

      let accessToken: AccessTokenPayload = {
        aud: response_audience,
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

    ['/v2/logout']: function(req, res) {
      req.session = null;

      let returnToUrl = req.query.returnTo ?? req.headers.referer;

      assert(typeof returnToUrl === 'string', `no logical returnTo url`);

      res.redirect(returnToUrl);
    },

    ['/userinfo']: function(req, res) {
      let token = null;
      if (req.headers.authorization) {
        let authorizationHeader = req.headers.authorization;
        token = authorizationHeader?.split(' ')?.[1];
      } else {
        token = req?.query?.access_token as string;
      }

      assert(!!token, 'no authorization header or access_token');
      let { sub } = decodeToken(token, { json: true }) as { sub: string };

      let user = personQuery((person) => {
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
