import configJson from "../../cypress.env.json";

describe('log in', () => {
  it('should get token without signing in', () => {
    cy.createSimulation(configJson)
      .then((simulation) => cy.given(simulation))
      .then((person) => cy.login({ currentUser: person.email }))
      .then(() => {
         cy.visit('/');

         cy.contains('Log out');
      }).logout();
  });
});
