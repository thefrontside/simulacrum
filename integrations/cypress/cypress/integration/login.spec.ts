import configJson from "../../cypress.env.json";

describe('log in', () => {
  it('should get token without signing in', () => {
    cy.createSimulation(configJson)
      .given({ email: 'bob@gmail.com' })
      .login()
      .then(() => {
         cy.visit('/');

         cy.contains('Log out');
      })
      .logout();
  });
});
