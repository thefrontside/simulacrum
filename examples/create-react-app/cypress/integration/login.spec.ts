import appConfig from "../../src/auth_config.json";

describe('login', () => {
  describe('@simulacrum/auth0-cypress', () => {
    it('should get token without signing in and access restricted route',  () => {
      cy.createSimulation(appConfig)
        .given()
        .login()
        .visit('/external-api')
        .url().should('include', '/external-api')
        .contains('Ping API').click()
        .contains('Your access token was successfully validated')
        .logout();
    });
  })
});