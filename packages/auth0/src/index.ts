import type { Simulator, LegacyServiceCreator } from '@simulacrum/server';
import { createHttpApp, createLoggingMiddleware } from '@simulacrum/server';
import { urlencoded, json } from 'express';
import { createAuth0Handlers } from './handlers/auth0-handlers';
import { person } from '@simulacrum/server';
import { createSession } from './middleware/session';
import path from 'path';
import express from 'express';
import { Options } from './types';
import { createCors } from './middleware/create-cors';
import { noCache } from './middleware/no-cache';
import { createOpenIdHandlers } from './handlers/openid-handlers';
import { label } from 'effection';


const publicDir = path.join(__dirname, 'views', 'public');

const DefaultOptions = {
  clientId: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
};

const createAuth0Service = (handlers: ReturnType<typeof createAuth0Handlers> & ReturnType<typeof createOpenIdHandlers>): LegacyServiceCreator => {
  return {
    protocol: 'https',
    app: createHttpApp()
          .use(express.static(publicDir))
          .use(createSession())
          .use(createCors())
          .use(noCache())
          .use(json())
          .use(urlencoded({ extended: true }))
          .use(createLoggingMiddleware(function * (message) {
            yield label({ name: 'auth0-logging-middleware', log: message });
          }))
          .get('/heartbeat', handlers['/heartbeat'])
          .get('/authorize', handlers['/authorize'])
          .get('/login', handlers['/login'])
          .get('/u/login', handlers['/usernamepassword/login'])
          .post('/usernamepassword/login', handlers['/usernamepassword/login'])
          .post('/login/callback', handlers['/login/callback'])
          .post('/oauth/token', handlers['/oauth/token'])
          .get('/v2/logout', handlers['/v2/logout'])
          .get('/.well-known/jwks.json', handlers['/.well-known/jwks.json'])
          .get('/.well-known/openid-configuration', handlers['/.well-known/openid-configuration'])

  } as const;
};

export const auth0: Simulator<Options> = (slice, options) => {
  let store = slice.slice('store');
  let services = slice.slice('services');

  let handlersOptions = { ...DefaultOptions, ...options, store, services };

  let auth0Handlers = createAuth0Handlers(handlersOptions);
  let openIdHandlers = createOpenIdHandlers(handlersOptions);

  return {
    services: { auth0: createAuth0Service({ ...auth0Handlers, ...openIdHandlers }) },
    scenarios: {
      /**
       * Here we just export the internal `person` scenario so that it can be
       * used with the a standalone auth0 simulator. However,
       * what we really need to have some way to _react_ to the person
       * having been created and augment the record at that point.
       */
      person
    }
  };
};
