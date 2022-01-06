import { Person } from '../types';
import { auth } from '../auth';
import { DefaultDirectoryLoginOptions } from 'auth0-js';
import { makeCypressLogger } from '../utils/cypress-logger';

const log = makeCypressLogger('simulacrum-get-user-tokens');

Cypress.Commands.add('getUserTokens', (person: Person) => {
  let { email, password } = person;

  let auth0ClientSecret = Cypress.env('auth0ClientSecret');

  assert([email, password, auth0ClientSecret].every(Boolean), 'email, auth0ClientSecret and password are required');

  log(`about to attempt login with email: ${email}`);

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
        log(`login successful for ${email}`);
        resolve(response);
      }
    });
  });
});
