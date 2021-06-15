import type { Simulator, Service } from '@simulacrum/server';
import { createHttpApp } from '@simulacrum/server';
import express from 'express';
import { urlencoded, json } from 'express';
import { createCors } from './middleware/create-cors';
import { noCache } from './middleware/no-cache';
import { createSession } from './middleware/session';
import { createAuth0Handlers } from './handlers/auth0-handlers';
import path from 'path';
import { person } from '@simulacrum/server';

const publicDir = path.join(process.cwd(), 'src', 'views', 'public');

let auth0Handlers = createAuth0Handlers();

const createAuth0Service = (): Service => {
  return {
    protocol: 'https',
    app: createHttpApp()
          .use(express.static(publicDir))
          .use(createSession())
          .use(createCors())
          .use(noCache())
          .use(json())
          .use(urlencoded({ extended: true }))
          .get('/heartbeat', auth0Handlers['/heartbeat'])

  } as const;
};

export const auth0: Simulator = () => {
  return {
    services: { auth0: createAuth0Service() },
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
