import { Simulator, createHttpApp, Person, person as createPerson, Store } from "@simulacrum/server";
import { createHandlers } from './handlers';

const scope = 'openid profile email offline_access';
// TODO: we need to get this from the service
const port = 4400;

const createAuth0Service = (store: Store) => {
  let url = `https://localhost:${port}`;
  let { heartbeat, login, loginHandler, token } = createHandlers({
    store,
    url,
    scope,
    port
  });

  return {
    protocol: 'https',
    port,
    app: createHttpApp()
            .get("/heartbeat", heartbeat)
            .get('/login', login)
            .post('/usernamepassword/login', loginHandler)
            .post('/oauth/token', token)
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
