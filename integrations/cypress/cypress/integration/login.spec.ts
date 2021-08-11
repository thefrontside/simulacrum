// import { Simulation } from '@simulacrum/client';
import auth0Config from "../../cypress.env.json";

describe('auth', () => {
  describe('log in', () => {
    it('should get token without signing in', () => {
      cy.createSimulation(auth0Config)
        .given()
        .login()
        .then(() => {
           cy.visit('/');

           cy.contains('Log out');
        })
        .logout();
    });
  });
});
