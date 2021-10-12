import { describe } from 'mocha';
import auth0Config from "../../cypress.env.json";

describe("auth", () => {
  describe("log in, create person per test", () => {
    it("should log in and log out", () => {
      cy
        .createSimulation(auth0Config)
        .visit("/")
        .contains("Log out").should('not.exist')
        .given()
        .login()
        .visit("/")
        .contains("Log out")
        .logout();
    });
  });

  describe("log in, create simulation and person in beforeEach", () => {
    beforeEach(() => {
      cy.createSimulation(auth0Config)
      .given();
    });

    it("should login and logout", () => {
      cy
        .visit("/")
        .contains("Log out").should('not.exist')
        .login()
        .visit("/")
        .contains("Log out")
        .logout();
    });
  });


  describe("createSimulation in beforeEach and logout in afterEach", () => {
    beforeEach(() => {
      cy.createSimulation(auth0Config);
    });

    afterEach(() => {
      cy.logout();
    });

    it("should login once", () => {
        cy
        .visit("/")
        .contains("Log out").should('not.exist')
        .given({ email: 'first@gmail.com' })
        .login()
        .visit("/")
        .contains("Log out");
    });

    it("should login two times without error", () => {
      cy
      .visit("/")
      .contains("Log out").should('not.exist')
      .given({ email: 'second@gmail.com' })
      .login()
      .visit("/")
      .contains("Log out");
    });

    it("should login three times without error", () => {
      cy
      .visit("/")
      .contains("Log out").should('not.exist')
      .given({ email: 'third@gmail.com' })
      .login()
      .visit("/")
      .contains("Log out");
    });

    it("should login four times without error", () => {
      cy.visit("/")
      .contains("Log in")
      .contains("Log out").should('not.exist')
        .given({ email: 'fourth@gmail.com', password: 'passw0rd' })
        .login()
        .visit("/")
        .contains("Log out");
    });
  });

  // describe("logout in beforeEach", () => {
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
