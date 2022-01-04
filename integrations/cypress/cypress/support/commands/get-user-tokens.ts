import { Person } from '../types';
import { auth } from '../auth';
import { DefaultDirectoryLoginOptions } from 'auth0-js';

Cypress.Commands.add('getUserTokens', (person: Person) => {
  let { email, password } = person;

  let auth0ClientSecret = Cypress.env('auth0ClientSecret');

  assert([email, password, auth0ClientSecret].every(Boolean), 'email, auth0ClientSecret and password are required');

  return new Cypress.Promise((resolve, reject) => {
    auth.client.loginWithDefaultDirectory({
      username: email,
      password,
      audience: Cypress.env('audience'),
      scope: Cypress.env('scope'),
      client_secret: auth0ClientSecret,
    } as DefaultDirectoryLoginOptions, (err, response) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
});
