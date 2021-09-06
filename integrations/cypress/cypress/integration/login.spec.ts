import { describe } from 'mocha';
import { Simulation } from "../../../../packages/client/dist";
import auth0Config from "../../cypress.env.json";
import { Person } from "../../src/cypress";

describe("auth", () => {
  describe("log in, create person per test", () => {
    it("should get token without signing in", () => {
      cy.logout()
        .createSimulation(auth0Config)
        .visit("/")
        .contains("Log out").should('not.exist')
        .given()
        .login()
        .visit("/")
        .contains("Log out");
    });
  });

  describe("log in, create person once", () => {
    let simulation: Cypress.Chainable<Simulation>;
    let person: Cypress.Chainable<Person>;

    beforeEach(() => {
      simulation = cy.logout().createSimulation(auth0Config);
      person = simulation.given();
    });

    it("should login", () => {
      person
        .visit("/")
        .contains("Log out").should('not.exist')
        .login()
        .visit("/")
        .contains("Log out");
    });
  });

  describe("simulation member var", () => {
    let simulation: Cypress.Chainable<Simulation>;

    beforeEach(() => {
      simulation = cy.logout().createSimulation(auth0Config);
    });

    it("should login", () => {
      cy.visit("/")
      .contains("Log in")
      .contains("Log out").should('not.exist');

      simulation
        .given()
        .login()
        .visit("/")
        .contains("Log out");
    });
  });

  // describe.only("logout in beforeEach", () => {
  //   let simulation: Cypress.Chainable<Simulation>;
  //   let person: Cypress.Chainable<Person>;

  //   beforeEach(async () => {
  //     if (person) {
  //       person.logout();
  //     }
  //     simulation = cy.createSimulation(auth0Config);
  //     person = simulation.given();
  //   });

  //   it("should login", () => {
  //     cy.visit("/");
  //     cy.contains("Log in");
  //     person.login().then(() => {
  //       cy.visit("/");
  //       cy.contains("Log out");
  //     });
  //   });

  //   it("should login again ", () => {
  //     cy.visit("/");
  //     cy.contains("Log in");
  //     person.login().then(() => {
  //       cy.visit("/");
  //       cy.contains("Log out");
  //     });
  //   });
  // });
});
