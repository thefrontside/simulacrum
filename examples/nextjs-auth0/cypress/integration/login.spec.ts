import auth0Config from "../../cypress.env.json";

describe("login page", () => {
  it("should access restricted resource", () => {
    cy.createSimulation(auth0Config).given({
      email: "test+hirer@askenigma.com"
    }).visit("/")
      .login()
      .visit("/hirer");

    cy.url().should("eq", "http://localhost:3000/hirer");
  });
});
