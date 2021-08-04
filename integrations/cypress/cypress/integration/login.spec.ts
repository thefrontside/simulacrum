import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import type { Client, Scenario, Simulation } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import configJson from "./cypress.env.json";

interface Person { email: string; password: string }

describe('login', () => {
  let client: Client;
  let simulation: Simulation;
  let person: Person;

  before(async () => {
    client = createClient('http://localhost:4000');
  });

  after(async () => {
    if(simulation){
      await client.destroySimulation(simulation);
    }
  });

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let { domain, ...auth0Options } = configJson as Auth0ClientOptions;

    console.log({ s: !!simulation && simulation.status });

    simulation = await client.createSimulation("auth0", {
      options: {
        ...auth0Options
      },
      services: {
        auth0: {
          port: 4400
        }
      }
    });

    let { data } = await client.given(simulation, "person") as Scenario<Person>;

    console.dir({ simulation, data });
    person = data;
  });

  // describe('Universal Login', () => {
  //   it('should fail login', () => {
  //     cy.visit('/')

  //     cy.get('#qsLoginBtn').first().click();

  //     cy.get('#username')
  //     .type('bob@gmail.com');

  //     cy.get('#password')
  //     .type('sdfsdfsdfsd');

  //     cy.get('#submit').click();

  //     cy.get('.nav-link').should('not.exist');
  //   })

  //   it('should login', async () => {
  //     let { data } = await client.given(simulation, "person") as Scenario<Person>;
  //     let person =  data;

  //     cy.visit('/')

  //     cy.get('#qsLoginBtn').first().click();

  //     cy.get('#username')
  //     .type(person.email)
  //     .should('have.value', person.email);

  //     cy.get('#password')
  //     .type(person.password)
  //     .should('have.value', person.password);

  //     cy.get('#submit').click();

  //     cy.get('.nav-link').should('contain', 'External API');
  //   })
  // })

  describe('normal flow', () => {
    it('should get token without signing in and access restricted route', () => {
      cy.login({ currentUser: person.email });

      cy.visit('/external-api');

      cy.url().should('include', '/external-api');

      cy.contains('Ping API').click();

      cy.contains('Your access token was successfully validated');
    });
  });
});
