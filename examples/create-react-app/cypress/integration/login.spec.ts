import appConfig from "../../src/auth_config.json";

describe('login', () => {
  describe('login and call an external api', () => {
    it('should get token without signing in and access restricted route',  () => {
      cy.createSimulation(appConfig)
        .given()
        .login()
        .visit('/external-api')
        .get('[data-cy=ping]').click()
        .get('[data-cy=api-message]').should('contain', 'Your access token was successfully validated')
        .url().should('include', '/external-api')
        .logout();
    });
  })
});