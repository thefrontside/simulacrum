import type { AddressInfo } from 'net';
import type { Person } from '@simulacrum/server';
import { createAppServer, consoleLogger, person, ResourceServiceCreator, Simulator } from '@simulacrum/server';
import type { Operation } from 'effection';
import { ensure, once, spawn, createFuture } from 'effection';
import express, { json, urlencoded } from 'express';
import path from 'path';
import { getConfig } from './config/get-config';
import type { Auth0Store, AuthSession } from './handlers/auth0-handlers';
import { createAuth0Handlers } from './handlers/auth0-handlers';
import { getServiceUrl } from './handlers/get-service-url';
import { createOpenIdHandlers } from './handlers/openid-handlers';
import { createCors } from './middleware/create-cors';
import { noCache } from './middleware/no-cache';
import { createSession } from './middleware/session';
import type { Auth0Configuration } from './types';

export { getConfig } from './config/get-config';

const publicDir = path.join(__dirname, 'views', 'public');

interface Server {
  port: number;
}

export interface Auth0ServerOptions {
  config: Auth0Configuration;
  store: Auth0Store;
  people: Iterable<Person>;
  serviceURL: () => URL;
  port?: number;
  debug?: boolean;
}

const createAuth0Service: ResourceServiceCreator = (slice, options) => ({
  name: 'Auth0Service',
  *init() {
    let debug = !!slice.slice('debug').get();
    let { port } = options;
    let config = getConfig(slice.slice('options').slice('options').get());

    let serviceURL = () => getServiceUrl(slice.get());

    let auth0Store = slice.slice('store').slice('auth0');

    let store: Auth0Store = {
      get: (nonce) => auth0Store.slice(nonce).get() as AuthSession,
      set: (nonce, session) => auth0Store.slice(nonce).set(session),
    };

    let people: Iterable<Person> = {
      *[Symbol.iterator]() {
        let values = Object.values(slice.slice('store').slice('people').get() ?? {});
        for (let person of values) {
          yield person as Person;
        }
      }
    };

    console.dir({ options })

    let server: Server = yield createAuth0Server({
      debug,
      config,
      store,
      serviceURL,
      people,
      port
    });

    console.dir({ server })

    return {
      port: server.port,
      protocol: 'https',
    };
  }
});

function createAuth0Server(options: Auth0ServerOptions): Operation<Server> {
  let { config, serviceURL, store, people, port, debug = true } = options;
  let auth0 = createAuth0Handlers(store, people, serviceURL, config);
  let openid = createOpenIdHandlers(serviceURL);

  return {
    name: 'Auth0Server',
    *init() {
      let app = express()
        .use(express.static(publicDir))
        .use(createSession())
        .use(createCors())
        .use(noCache())
        .use(json())
        .use(urlencoded({ extended: true }))
        .get('/heartbeat', auth0['/heartbeat'])
        .get('/authorize', auth0['/authorize'])
        .get('/login', auth0['/login'])
        .get('/u/login', auth0['/usernamepassword/login'])
        .post('/usernamepassword/login', auth0['/usernamepassword/login'])
        .post('/login/callback', auth0['/login/callback'])
        .post('/oauth/token', auth0['/oauth/token'])
        .get('/userinfo', auth0['/userinfo'])
        .get('/v2/logout', auth0['/v2/logout'])
        .get('/.well-known/jwks.json', openid['/.well-known/jwks.json'])
        .get('/.well-known/openid-configuration', openid['/.well-known/openid-configuration']);

      if (debug) {
        app.use(consoleLogger);
      }

      let server = createAppServer(app, { protocol: 'https', port });

      server.listen(options.port);

      yield spawn(function*() {
        throw yield once(server, 'error');
      });

      yield ensure(function*() {
        let { future, resolve, reject } = createFuture<void>();
        server.close((err) => err ? reject(err) : resolve());
        yield future;
      });

      yield once(server, 'listening');

      let address = server.address() as AddressInfo;

      return {
        port: address.port
      };
    }
  };
}

export const auth0: Simulator = () => {
  return {
    services: { auth0: createAuth0Service },
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
