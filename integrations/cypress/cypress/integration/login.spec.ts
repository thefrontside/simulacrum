// import { Simulation } from '@simulacrum/client';
import { Simulation } from "../../../../packages/client/dist";
import auth0Config from "../../cypress.example.env.json";
import { Person } from "../../src/cypress";

describe("auth", () => {
  describe("log in, create person per test", () => {
    it("should get token without signing in", () => {
      cy.createSimulation(auth0Config)
        .given()
        .login()
        .then(() => {
          cy.visit("/");
          cy.contains("Log out");
        })
        .logout();
    });
  });

  describe("log in, create person once", () => {
    let simulation: Cypress.Chainable<Simulation>;
    let person: Cypress.Chainable<Person>;

    beforeEach(async () => {
      simulation = cy.createSimulation(auth0Config);
      person = simulation.given();
    });

    it("should login", () => {
      person
        .login()
        .then(() => {
          cy.visit("/");
          cy.contains("Log out");
        })
        .logout();
    });
  });

  describe("logout in beforeEach", () => {
    let simulation: Cypress.Chainable<Simulation>;
    let person: Cypress.Chainable<Person>;

    beforeEach(() => {
      // log out from previous test run
      if (person) {
        person.logout();
      }

      simulation = cy.createSimulation(auth0Config);
      console.dir(simulation);
      person = simulation.given();
    });

    it("should login", () => {
      cy.visit("/");
      cy.contains("Log in");
      person.login().then(() => {
        cy.visit("/");
        cy.contains("Log out");
      });
    });

    it("should login again ", () => {
      cy.visit("/");
      cy.contains("Log in");
      person.login().then(() => {
        cy.visit("/");
        cy.contains("Log out");
      });
    });
  });
});
