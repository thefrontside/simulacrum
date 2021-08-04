import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import type { Client, Scenario, Simulation } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import configJson from "../../cypress.env.json";

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

  describe('log in', () => {
    it('should get token without signing in', () => {
      cy.login({ currentUser: person.email });

      cy.contains('Log out');
    });
  });
});
