# @simulacrum/auth0-cypress

## Contents

- [Installation](#installation)
- [Usage](#usage)
  - [login()](#login)
  - [logout()](#logout)

## Installation

### Step 1: Install the addon

```sh
npm install @simulacrum/auth0-cypress --dev
```

### Step 2: Import the commands

```js
// cypress/support/index.js

import '@simulacrum/auth0-cypress';
```

### Step 3: Configure Auth0

An example [cypres environment file](./cypress.example.env.json) is in the root of this repo. Copy it into your project:

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
import config from '../../cypress.env.json';

describe('log in', () => {
  it('should get token without signing in', () => {
    cy.createSimulation(config)
      .given()
      .login()
      .then(() => {
        cy.visit('/');

        cy.contains('Log out');
      })
      .logout();
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

You may also log out _before_ each test to allow one to inspect the state after a test run.

```js
beforeEach(async () => {
  cy.logout();
});
```
