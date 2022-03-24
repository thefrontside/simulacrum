describe('login', () => {
  describe('login and call an external api', () => {
    it('should get token without signing in and access restricted route',  () => {
      cy.createSimulation()
        .given()
        .login()
        .visit('/external-api')
        .get('[data-testid=ping]').click()
        .get('[data-testid=api-message]').should('contain', 'Your access token was successfully validated')
        .url().should('include', '/external-api')
        .logout();
    });
  })
});