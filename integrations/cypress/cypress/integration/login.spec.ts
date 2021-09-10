import { describe } from 'mocha';
import { Simulation } from "../../../../packages/client/dist";
import auth0Config from "../../cypress.env.json";
import { Person } from "../../src/cypress";

describe("auth", () => {
  describe.only("log in, create person per test", () => {
    it("one", () => {
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

    it("two", () => {
      cy
        .createSimulation(auth0Config)
        .visit("/")
        .contains("Log out").should('not.exist')
        .given()
        .login()
        .visit("/")
        .contains("Log out");
        // .logout();
    });
  });

  describe("log in, create person once", () => {
    let simulation: Cypress.Chainable<Simulation>;
    let person: Cypress.Chainable<Person>;

    beforeEach(() => {
      simulation = cy.createSimulation(auth0Config);
      person = simulation.given();
    });

    it("should login", () => {
      person
        .visit("/")
        .contains("Log out").should('not.exist')
        .login()
        .visit("/")
        .contains("Log out");
        // .logout();
    });
  });


  describe.skip("use a simulation member variable", () => {
    // let simulation: Cypress.Chainable<Simulation>;

    // beforeEach(() => {
    //   simulation = cy;
    //   console.dir({ simulation });
    // });


    it("should login", () => {
        cy
        .createSimulation(auth0Config)
        .visit("/")
        .contains("Log out").should('not.exist')
        .given({ email: 'first@gmail.com' })
        .login()
        .visit("/")
        .contains("Log out");
        // .logout();
    });

    it("should login again", () => {
      cy
      .createSimulation(auth0Config)
      .visit("/")
      .contains("Log out").should('not.exist')
      .given({ email: 'second@gmail.com' })
      .login()
      .visit("/")
      .contains("Log out");
      // .logout();
    });


    it("should login again and again", () => {
      cy
      .createSimulation(auth0Config)
      .visit("/")
      .contains("Log out").should('not.exist')
      .given({ email: 'third@gmail.com' })
      .login()
      .visit("/")
      .contains("Log out");
      // .logout();
        // .logout();
    });


    it("should login again and again and again", () => {
      cy.wait(1000).createSimulation(auth0Config).visit("/")
      .contains("Log in")
      .contains("Log out").should('not.exist')
        .given({ email: 'fourth@gmail.com', password: 'passw0rd' })
        .login()
        .visit("/")
        .contains("Log out");
        // .logout();
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
