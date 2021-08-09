/// <reference types="cypress" />
import { createClient } from "@simulacrum/client";
import {
  Button,
  Heading,
  TextField,
  Link,
  HTML,
  including,
} from "@bigtest/cypress";

// need to start up and configure simulation server
describe("test the login flow", () => {
  let client = null;
  let simulation = null;
  let person = null;

  before(() => {
    client = createClient("http://localhost:4000");
  });

  beforeEach(async () => {
    simulation = await client.createSimulation("auth0", {
      options: {
        audience: "https://your-audience/",
        scope: "openid profile read:shows",
        clientId: "YOUR_AUTH0_CLIENT_ID",
        rulesDirectory: "./rules",
      },
      services: {
        auth0: {
          port: 4400, // port for the auth0 service itself
        },
      },
    });
    let { data } = await client.given(simulation, "person");

    person = data;
  });

  afterEach(async () => {
    if (simulation) {
      console.log("destroy simulation", simulation);
      await client.destroySimulation(simulation);
      simulation = null;
      person = null;
    }
  });

  describe("login from the homepage", () => {
    beforeEach(() => cy.visit("/"));

    it("login is visible", () => {
      cy.expect(Link("Login").exists());
    });

    it("logs in user", () => {
      cy.do(Link("Login").click());

      cy.expect(Heading("Welcome").exists());

      cy.do([
        TextField("Email address").fillIn(person.email),
        TextField("Password").fillIn(person.password),
        Button("Sign in").click(),
      ]);

      cy.expect(Button("Log out").exists());
    });

    it("logs in and vists private route", () => {
      cy.do([
        Link("Login").click(),
        TextField("Email address").fillIn(person.email),
        TextField("Password").fillIn(person.password),
        Button("Sign in").click(),
        Link("Private Route").click(),
      ]);

      cy.expect(HTML({ text: including("This route is private.") }).exists());
    });
  });
});
