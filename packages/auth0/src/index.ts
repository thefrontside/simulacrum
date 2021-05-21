import { Simulator, createHttpApp, Person, person as createPerson, Store } from "@simulacrum/server";
import { createHandlers } from './handlers';
import { urlencoded, json } from 'express';

// TODO: move this into config
const scope = 'openid profile email offline_access';
const port = 4400;
const audience = 'https://frontside.auth0.com/api/v2/';
const tenant = "frontside";
const clientId = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

const createAuth0Service = (store: Store) => {
  let url = `https://localhost:${port}`;
  let handlers = createHandlers({
    store,
    url,
    scope,
    port,
    audience,
    tenant,
    clientId
  });

  return {
    protocol: 'https',
    port,
    app: createHttpApp()
          .use(urlencoded({ extended: true }))
          .use(json())
          .use((_, res, next) => {
            res.set("Pragma", "no-cache");
            res.set("Cache-Control", "no-cache, no-store");
            next();
          })
          .get('/heartbeat', handlers['/heartbeat'])
          .get('/authorize', handlers['/authorize'])
          .get('/login', handlers['/login'])
          .post('/usernamepassword/login', handlers['/usernamepassword/login'])
          .get('/u/login', handlers['/u/login'])
          .post('/login/callback', handlers['/login/callback'])
          .post('/oauth/token', handlers['/oauth/token'])
          .get('/v2/logout', handlers['/v2/logout'])
  } as const;
};

export const auth0: Simulator = () => ({
  services: { auth0: createAuth0Service },
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
      let augmented = { ...person, email, password };
      store.slice('people').slice(person.id).set(augmented);
      return augmented;
    }
  }
});
