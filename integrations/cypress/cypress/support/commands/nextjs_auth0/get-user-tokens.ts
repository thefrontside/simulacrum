import type { Person } from '../../types';
import type { DefaultDirectoryLoginOptions } from 'auth0-js';
import { makeCypressLogger } from '../../utils/cypress-logger';
import { getConfig } from '../../utils/config';

const log = makeCypressLogger('simulacrum-get-user-tokens');

Cypress.Commands.add('getUserTokens', (person: Person) => {
  let { email, password } = person;
  let { audience, scope } = getConfig();

  let { clientSecret } = getConfig();

  assert([email, password, clientSecret].every(Boolean), 'email, auth0ClientSecret and password are required');

  log(`about to attempt login with email: ${email}`);

  return new Cypress.Promise((resolve, reject) => {
    import('./auth').then(m => m.auth).then((auth) => {
      auth.client.loginWithDefaultDirectory({
        username: email,
        password,
        audience,
        scope,
        client_secret: clientSecret,
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
});
