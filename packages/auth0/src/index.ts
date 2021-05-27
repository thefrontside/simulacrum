import type { Request, Response } from 'express';
import { Simulator, createHttpApp, Person, person as createPerson, Store, Service } from "@simulacrum/server";
import { createAuth0Handlers } from './handlers/auth0-handlers';
import { urlencoded, json } from 'express';
import { createOpenIdHandlers } from './handlers/openid-handlers';
import { createCors } from './middleware/create-cors';
import { noCache } from './middleware/no-cache';
import { createSession } from './middleware/session';
import { createUtilityRoutes } from './handlers/utility-handlers';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// TODO: move this into config
const scope = 'openid profile email offline_access';
const port = 4400;
const audience = "https://thefrontside.auth0.com/api/v1/";
const tenant = "frontside";
const clientId = 'IsuLUyWaFczCbAKQrIpVPmyBTFs4g5iq';

const emptyResponse = function*(_: Request, res: Response<Record<never, never>>) {
  res.json({});
};

const createAuth0Service = (store: Store): Service => {
  let url = `https://localhost:${port}`;
  let auth0Handlers = createAuth0Handlers({
    store,
    url,
    scope,
    port,
    audience,
    tenant,
    clientId
  });


  let openIdHandlers = createOpenIdHandlers({
    url,
    store
  });

  let utilityHandlers = createUtilityRoutes({ url, store, audience });

  return {
    protocol: 'https',
    port,
    app: createHttpApp()
          .use(createSession())
          .use(createCors())
          .use(noCache())
          .use(json())
          .use(urlencoded({ extended: true }))
          .get('/heartbeat', auth0Handlers['/heartbeat'])
          .get('/authorize', auth0Handlers['/authorize'])
          .get('/login', auth0Handlers['/login'])
          .post('/usernamepassword/login', auth0Handlers['/usernamepassword/login'])
          .get('/u/login', auth0Handlers['/u/login'])
          .post('/login/callback', auth0Handlers['/login/callback'])
          .post('/oauth/token', auth0Handlers['/oauth/token'])
          .get('/v2/logout', auth0Handlers['/v2/logout'])
          .get('/.well-known/jwks.json', openIdHandlers['/.well-known/jwks.json'])
          .get('/.well-known/openid-cofiguration', openIdHandlers['/.well-known/openid-cofiguration'])
          .post('/userinfo', emptyResponse.bind({}))
          .post('/dbconnections/change_password', emptyResponse.bind({}))
          .post('/dbconnections/signup', emptyResponse.bind({}))
          .get('/utility/token', utilityHandlers['/utility/token'])
          .post('/utility/verify', utilityHandlers['/utility/verify'])

  } as const;
};

export const auth0: Simulator = (store) => ({
  services: { auth0: createAuth0Service(store) },
  scenarios: {
    /**
     * Here we just wrap the internal `person` scenario to augment
     * it with a username and password
     * but what we really need to have some way to _react_ to the person
     * having been created and augment the record at that point.
     */
    *person(store, faker) {
      let person: Person = yield createPerson(store, faker);
      let email = faker.internet.email(person.name, undefined);
      let password = faker.internet.password();
      let avatar = faker.image.avatar();
      let augmented = { ...person, email, password, picture: avatar };

      store.slice('people').slice(person.id).set(augmented);
      return augmented;
    }
  }
});
