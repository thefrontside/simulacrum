import { auth } from './authorization_code/auth';

Cypress.Commands.add('getUserInfo', (accessToken) => {
  return new Cypress.Promise((resolve, reject) => {
    auth.client.userInfo(accessToken, (err, user) => {
      if (err) {
        reject(err);
      }

      resolve(user);
    });
  });
});
