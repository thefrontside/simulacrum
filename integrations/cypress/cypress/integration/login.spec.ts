import configJson from "../../cypress.env.json";

describe('log in', () => {
  it('should get token without signing in', () => {
    cy.createSimulation(configJson)
      .given()
      .then((person) => cy.login({ currentUser: person.email }))
      .then(() => {
         cy.visit('/');

         cy.contains('Log out');
      }).logout();
  });
});
