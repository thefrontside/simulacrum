import { Simulator, createHttpApp, Person, person as createPerson, HttpHandler } from "@simulacrum/server";
import { Store } from '@simulacrum/server';
import { loginView } from './views/login';

const heartbeat: HttpHandler = function *(_, res) {
  res.status(200).json({ ok: true });
};

const login: HttpHandler = function* (req, res) {
  let html = loginView();

  res.set("Content-Type", "text/html");

  res.status(200).send(Buffer.from(html));
};

const createAuth0Service = (store?: Store) => {
  console.log({ store });
  return {
    protocol: 'https',
    port: 4400,
    app: createHttpApp().get("/heartbeat", heartbeat).get('/login', login)
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
