import { Person } from '../types';
import { auth } from '../auth';

Cypress.Commands.add('getUserTokens', (person: Person) => {
  let { email, password } = person;

  return new Cypress.Promise((resolve, reject) => {
    auth.client.loginWithDefaultDirectory({
      username: email,
      password,
      audience: Cypress.env('auth0Audience'),
      scope: Cypress.env('auth0Scope'),
      client_secret: Cypress.env('auth0ClientSecret'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, (err, response) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.dir({ response }, { depth: 33 });
        resolve(response);
      }
    });
  });
});
