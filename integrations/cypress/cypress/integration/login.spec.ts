import { describe } from 'mocha';
import auth0Config from "../../cypress.env.json";

describe("auth", () => {
  describe("log in, create person per test", () => {
    beforeEach(() => {
      cy.logout();
    });

    it("should log in and log out", () => {
      cy
        .visit("/")
        .createSimulation(auth0Config)
        .get('[data-testid=logout]').should('not.exist')
        .given()
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist')
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
        .get('[data-testid=home]').should('exist')
        .get('[data-testid=logout]').should('not.exist')
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist')
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
        .get('[data-testid=home]').should('exist')
        .get('[data-testid=logout]').should('not.exist')
        .given({ email: 'first@gmail.com' })
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist');
    });

    it("should login two times without error", () => {
      cy
        .visit("/")
        .get('[data-testid=home]').should('exist')
        .get('[data-testid=logout]').should('not.exist')
        .given({ email: 'second@gmail.com' })
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist');
    });

    it("should login three times without error", () => {
      cy
        .visit("/")
        .get('[data-testid=home]').should('exist')
        .get('[data-testid=logout]').should('not.exist')
        .given({ email: 'third@gmail.com' })
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist');
    });

    it("should login four times without error", () => {
      cy.visit("/")
        .get('[data-testid=home]').should('exist')
        .get('[data-testid=logout]').should('not.exist')
        .given({ email: 'fourth@gmail.com', password: 'passw0rd' })
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist');
    });
  });

  describe("logout in beforeEach", () => {
    beforeEach(() => {
      cy.logout()
        .createSimulation(auth0Config)
        .given();
    });

    it("should login once", () => {
        cy
          .visit("/")
          .get('[data-testid=home]').should('exist')
          .get('[data-testid=logout]').should('not.exist')
          .login()
          .visit("/")
          .get('[data-testid=logout]').should('exist');
    });

    it("should login twice without error", () => {
      cy
        .visit("/")
        .get('[data-testid=home]').should('exist')
        .get('[data-testid=logout]').should('not.exist')
        .given({ email: 'second@gmail.com' })
        .login()
        .visit("/")
        .get('[data-testid=logout]').should('exist');
    });
  });
});
