# @simulacrum/cypress-auth0

## Contents

- [Installation](#installation)
- [Usage](#usage)
  - [login()](#login)
  - [logout()](#logout)

## Installation

### Step 1: Install the addon

```sh
npm install @simulacrum/cypress-auth0 --dev
```

### Step 2: Import the commands

```js
// cypress/support/index.js

import '@simulacrum/cypress-auth0';
```

### Step 3: Configure Auth0

An example [cypres environment file](./cypress.example.env.json) is in the root of this repo.  Copy it into your project:

```bash
mv ./cypress.example.env.json ./cypress.env.json
```

```json
// cypress.env.json
{
  "audience": "https://thefrontside.auth0.com/api/v1/",
  "domain": "localhost:4400",
  "clientId": "YOUR_AUTH0_CLIENT_ID",
  "connection": "Username-Password-Authentication",
  "scope": "openid profile email offline_access"
}
```

## Usage

Start the simulator

```shell
PORT=4000 npx auth0-simulator
```

The following commands are now available in your test suite:

- [login()](#login)
- [logout()](#logout)

### login()

Call login and logout in your test. For example:

```js
import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import type { Client, Scenario, Simulation } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import configJson from "../../cypress.env.json";

describe('login', () => {
  let client: Client;
  let simulation: Simulation;
  let person: Person;

  before(async () => {
    client = createClient('http://localhost:4000');
  });

  after(async () => {
    cy.logout();
    if(simulation){
      await client.destroySimulation(simulation);
    }
  });

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let { domain, ...auth0Options } = configJson as Omit<Auth0ClientOptions, 'client_id'> & { clientId: string };

    let port = Number(configJson.domain.split(':').slice(-1)[0]);

    simulation = await client.createSimulation("auth0", {
      options: {
        ...auth0Options
      },
      services: {
        auth0: {
          port
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

      cy.visit('/');

      cy.contains('Log out');
    });
  });
});
```

### logout()

```js
cy.logout();
```

You might want to log out after every test.

```js
after(async () => {
  cy.logout();
});
```
