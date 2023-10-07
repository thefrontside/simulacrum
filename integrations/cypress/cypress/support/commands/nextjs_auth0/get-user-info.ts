export function getUserInfo(accessToken) {
    cy.then(() => {
        return new Cypress.Promise((resolve, reject) => {
            import('./auth').then(m => m.Auth0NextJsConfig()).then((auth) => {
                auth.client.userInfo(accessToken, (err, user) => {
                    if (err) {
                        reject(err);
                    }

                    resolve(user);
                });
            });
        });
    });
}
