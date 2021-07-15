import type { Simulator, Service } from '@simulacrum/server';
import { createHttpApp, person } from '@simulacrum/server';
import express, { urlencoded, json } from 'express';
import path from 'path';

import { createUserFromPerson } from './effects/user';
import { createAuth0Handlers } from './handlers/auth0-handlers';
import { createCors } from './middleware/create-cors';
import { noCache } from './middleware/no-cache';
import { createOpenIdHandlers } from './handlers/openid-handlers';
import { createSession } from './middleware/session';
import { Options } from './types';

const publicDir = path.join(process.cwd(), 'src', 'views', 'public');

const DefaultOptions = {
  clientId: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
};

const createAuth0Service = (handlers: ReturnType<typeof createAuth0Handlers> & ReturnType<typeof createOpenIdHandlers>): Service => {
  return {
    protocol: 'https',
    app: createHttpApp()
          .use(express.static(publicDir))
          .use(createSession())
          .use(createCors())
          .use(noCache())
          .use(json())
          .use(urlencoded({ extended: true }))
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
    scenarios: { person },
    *effects(slice, faker) {
      yield createUserFromPerson(slice, faker);
    },
  };
};
