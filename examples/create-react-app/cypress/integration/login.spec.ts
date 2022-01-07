import { Client, createClient, Scenario, Simulation } from '@simulacrum/client';
import configJson from "../../src/auth_config.json";

interface Person { email: string; password: string }

describe('login', () => {
  describe('@simulacrum/auth0-cypress', () => {
    it('should get token without signing in and access restricted route',  () => {
      cy.createSimulation(configJson)
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