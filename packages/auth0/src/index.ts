import type { Simulator, Service } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import { urlencoded, json } from 'express';
import { createAuth0Handlers } from './handlers/auth0-handlers';
import { person } from '@simulacrum/server';
import path from 'path';
import express from 'express';
import { Options } from './types';

const publicDir = path.join(process.cwd(), 'src', 'views', 'public');

const DefaultOptions = {
  clientId: '00000000000000000000000000000000',
  audience: 'https://thefrontside.auth0.com/api/v1/',
  scope: "openid profile email offline_access",
};

const createAuth0Service = (handlers: ReturnType<typeof createAuth0Handlers>): Service => {
  return {
    protocol: 'https',
    app: createHttpApp()
          .use(express.static(publicDir))
          .use(json())
          .use(urlencoded({ extended: true }))
          .get('/heartbeat', handlers['/heartbeat'])
          .get('/authorize', handlers['/authorize'])
          .get('/login', handlers['/login'])

  } as const;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const auth0: Simulator<Options> = (authOptions) => {
  let { options } = authOptions.get().options;

  let handlers = createAuth0Handlers({ ...DefaultOptions, ...options });

  return {
    services: { auth0: createAuth0Service(handlers) },
    scenarios: {
      /**
       * Here we just wrap the internal `person` scenario to augment
       * it with a username and password
       * but what we really need to have some way to _react_ to the person
       * having been created and augment the record at that point.
       */
      *person(store, faker) {
        return yield person(store, faker);
      }
    }
  };
};
