import { describe } from 'mocha';
import auth0Config from "../../cypress.env.json";

describe("auth", () => {
  describe("log in, create person per test", () => {
    it("should log in and log out", () => {
      cy
        .createSimulation(auth0Config)
        .visit("/")
        .contains("Logout").should('not.exist')
        .given()
        .login()
        .visit("/")
        .contains("Logout")
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
        .contains("Logout").should('not.exist')
        .login()
        .visit("/")
        .contains("Logout")
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
        .contains("Logout").should('not.exist')
        .given({ email: 'first@gmail.com' })
        .login()
        .visit("/")
        .contains("Logout");
    });

    it("should login two times without error", () => {
      cy
        .visit("/")
        .contains("Logout").should('not.exist')
        .given({ email: 'second@gmail.com' })
        .login()
        .visit("/")
        .contains("Logout");
    });

    it("should login three times without error", () => {
      cy
      .visit("/")
      .contains("Logout").should('not.exist')
      .given({ email: 'third@gmail.com' })
      .login()
      .visit("/")
      .contains("Logout");
    });

    it("should login four times without error", () => {
      cy.visit("/")
      .contains("Login")
      .contains("Logout").should('not.exist')
        .given({ email: 'fourth@gmail.com', password: 'passw0rd' })
        .login()
        .visit("/")
        .contains("Logout");
    });
  });

  // describe("logout in beforeEach", () => {
  //   beforeEach(() => {
  //     cy.logout()
  //       .createSimulation(auth0Config)
  //       .given();
  //   });

  //   it("should login once", () => {
  //       cy
  //         .visit("/")
  //         .contains("Logout").should('not.exist')
  //         .login()
  //         .visit("/")
  //         .contains("Logout");
  //   });

  //   it("should login twice without error", () => {
  //     cy
  //       .visit("/")
  //       .contains("Logout").should('not.exist')
  //       .given({ email: 'second@gmail.com' })
  //       .login()
  //       .visit("/")
  //       .contains("Logout");
  //   });
  // });
});
