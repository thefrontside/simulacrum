import { Client, createClient, Scenario, Simulation } from '@simulacrum/client';
import configJson from "../../src/auth_config.json";

interface Person { email: string; password: string }

describe('login', () => {
  let client: Client;
  let simulation: Simulation;
  let person: Person;
    
  before(async () => {
    client = createClient('http://localhost:4000');
  });

  afterEach(async () => {
    if(simulation){
      await client.destroySimulation(simulation)
    }
  })

  beforeEach(async () => {
    const { domain, ...auth0Options } = configJson;

    console.log({s: !!simulation && simulation.status})
    
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
    
    person =  data;
  });
 
  describe('Universal Login', () => {
    it('should fail login', () => {
      cy.visit('/')
  
      cy.get('#qsLoginBtn').first().click();
  
      cy.get('#username')
      .type('bob@gmail.com');
  
      cy.get('#password')
      .type('sdfsdfsdfsd');
  
      cy.get('#submit').click();
  
      cy.get('.nav-link').should('not.exist');
    })
    
    it('should login', () => {
      cy.visit('/')
  
      cy.contains('Log in').first().click();

      cy.url().should('include', '/login');
  
      cy.get('#username')
      .type(person.email)
      .should('have.value', person.email);
  
      cy.get('#password')
      .type(person.password)
      .should('have.value', person.password);
  
      cy.get('#submit').click();
  
      cy.get('.nav-link').should('contain', 'External API');
    })
  });
});