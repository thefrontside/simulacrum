Cypress.Cookies.defaults({
  preserve: [
    Cypress.env('auth0SessionCookieName')
  ],
});
