import { Person } from '../types';
import { auth } from '../auth';

Cypress.Commands.add('getUserTokens', (person: Person) => {
  let { email, password } = person;

  let auth0ClientSecret = Cypress.env('auth0ClientSecret');

  console.log({ email, password, auth0ClientSecret, c: Cypress.env('audience'), d: Cypress.env('scope') });

  assert([email, password, auth0ClientSecret].every(Boolean), 'email, auth0ClientSecret and password are required');

  return new Cypress.Promise((resolve, reject) => {
    auth.client.loginWithDefaultDirectory({
      username: email,
      password,
      audience: Cypress.env('audience'),
      scope: Cypress.env('scope'),
      client_secret: auth0ClientSecret,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any, (err, response) => {
      if (err) {
        console.error(err);
        console.dir({ err }, { depth: 33 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log((err as any).stack);
        reject(err);
      } else {
        console.dir({ response }, { depth: 33 });
        resolve(response);
      }
    });
  });
});
