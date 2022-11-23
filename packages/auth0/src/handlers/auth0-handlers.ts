import type { Person } from '@simulacrum/server';
import type { Auth0Configuration, QueryParams, ResponseModes } from '../types';
import type { RequestHandler } from 'express';
import { createLoginRedirectHandler } from './login-redirect';
import { createWebMessageHandler } from './web-message';
import { loginView } from '../views/login';
import { createTokens } from './oauth-handlers';
import { assert } from 'assert-ts';
import { stringify } from 'querystring';
import { encode } from "base64-url";
import { userNamePasswordForm } from '../views/username-password';
import { decode as decodeToken } from 'jsonwebtoken';
import { createPersonQuery } from './utils';

export type Routes =
  | '/heartbeat'
  | '/authorize'
  | '/login'
  | '/usernamepassword/login'
  | '/login/callback'
  | '/oauth/token'
  | '/v2/logout'
  | '/userinfo'

export type AuthSession = { username: string, nonce: string };

export interface Auth0Store {
  get(nonce: string): AuthSession;
  set(nonce: string, session: AuthSession): void;
}

export const createAuth0Handlers = (store: Auth0Store, people: Iterable<Person>, serviceURL: () => URL, options: Auth0Configuration): Record<Routes, RequestHandler> => {
  let { audience, scope, clientID, rulesDirectory } = options;
  let personQuery = createPersonQuery(people);

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
      let query = req.query as QueryParams;
      let responseClientId = query.client_id ?? clientID;
      let responseAudience = query.audience ?? audience;
      assert(!!responseClientId, `no clientID assigned`);

      let html = loginView({
        domain: serviceURL().host,
        scope,
        redirectUri: query.redirect_uri,
        clientID: responseClientId,
        audience: responseAudience,
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
      try {
        let iss = serviceURL().toString();

        let responseClientId: string =
          (req?.body?.client_id as string) ?? clientID;
        let responseAudience: string =
          (req?.body?.audience as string) ?? audience;

        assert(!!responseClientId, '500::no clientID in options or request body');

        let tokens = await createTokens({
          body: req.body,
          iss,
          clientID: responseClientId,
          audience: responseAudience,
          rulesDirectory,
          people,
          scope
        });

        res.status(200).json({
          ...tokens,
          expires_in: 86400,
          token_type: "Bearer",
        });
      } catch (error: any) {
        let assertCondition = 'Assert condition failed: ';
        if (error?.message?.startsWith(assertCondition)) {
          let errorMessage = error.message.slice(assertCondition.length);
          let errorCode =
            errorMessage.slice(3, 5) === '::'
              ? parseInt(errorMessage.slice(0, 3))
              : 500;
          let errorResponse = errorMessage.slice(5);
          res.status(errorCode).send(errorResponse);
        } else {
          console.error(error)
          res
            .status(500)
            .json({
              error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
              },
            });
        }
      }
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
