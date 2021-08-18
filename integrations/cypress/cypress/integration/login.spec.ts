// import { Simulation } from '@simulacrum/client';
import { Simulation } from '../../../../packages/client/dist';
import auth0Config from '../../cypress.env.json';
import { Person } from '../../src/cypress';

describe('auth', () => {
  describe('log in, create person per test', () => {
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

  describe('log in, create person once', () => {
    let simulation: Cypress.Chainable<Simulation>;
    let person: Cypress.Chainable<Person>;

    beforeEach(async () => {
      simulation = cy.createSimulation(auth0Config);
      person = simulation.given();
    });

    it('should login', () => {
      person
        .login()
        .then(() => {
          cy.visit('/');

          cy.contains('Log out');
        })
        .logout();
    });
  });
});
