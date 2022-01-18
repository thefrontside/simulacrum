import appConfig from "../../src/auth_config.json";

describe('login', () => {
  describe('Universal Login', () => {
    it('should fail login with invalid credentials', () => {
      cy.createSimulation(appConfig)
        .visit('/')
        .get('#qsLoginBtn').first().click()
        .get('#username')
        .type('bob@gmail.com')
        .get('#password')
        .type('sdfsdfsdfsd')
        .get('#submit').click()
        .get('[data-testid=api-link]').should('not.exist')
        .logout();
    });
    
    it('should login', () => {
      let email = 'bob@gmail.com';
      let password = 'Passw0rd!';
      
      cy.createSimulation(appConfig)
        .given({ email, password })
        .visit('/')
        .contains('Log in').first().click()
        .url().should('include', '/login')
        .get('#username')
        .type(email)
        .should('have.value', email)
        .get('#password')
        .type(password)
        .should('have.value', password)
        .get('#submit').click()
        .get('[data-testid=api-link]').should('contain', 'External API')
        .logout();
    });
  });
});