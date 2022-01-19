Cypress.Commands.add('getUserInfo', (accessToken) => {
  return new Cypress.Promise((resolve, reject) => {
    import('./auth').then(m => m.auth).then((auth) => {
      auth.client.userInfo(accessToken, (err, user) => {
        if (err) {
          reject(err);
        }

        resolve(user);
      });
    });
  });
});
