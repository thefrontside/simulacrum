# @simulacrum/auth0-cypress

## Contents

- [Installation](#installation)
- [Usage](#usage)
  - [createSimulation](#createSimulation)
  - [given()](#given)
  - [login()](#login)
  - [logout()](#logout)
- [debugging](#debugging)
- [examples](./cypress/integration/login.spec.ts)

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

An example [cypress environment file](./cypress.env.json) is in the root of this repo. You can change the configuration to your auth0 values.

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
PORT=4000 npx @simulacrum/auth0-simulator
```

### Usage with start-server-and-test

Cypress recommends using [start-server-and-test](https://github.com/bahmutov/start-server-and-test) to ensure the test process exits and any servers are shut down.

```shell
npx start-server-and-test 'npm run start:server' http://localhost:3000 \
                      'npm run start:auth0' http://localhost:4000 \
                      cypress:run
```

The following commands are now available in your test suite:

- [createSimulation](#createSimulation)
- [given()](#given)
- [login()](#login)
- [logout()](#logout)

## createSimulation

`createSimulation` creates the fake auth0 server with your configuration

```ts
import auth0Config from "../../cypress.env.json";

describe('tests requiring auth')
  it('should access restricted resource', () => {
    cy
      .createSimulation(auth0Config)
```
## given

`given` creates a fake user that can be used to log into the fake auth0 server.

### create random user

```ts
describe('tests requiring auth')
  it('should access restricted resource', () => {
    cy
      .createSimulation(auth0Config)
      .visit("/")
      .contains("Log out").should('not.exist')
      .given() // with no arguments a random user is created
      .login()
```

### supply fixed fields

```ts
describe('tests requiring auth')
  it('should access restricted resource', () => {
    cy
      .createSimulation(auth0Config)
      .visit("/")
      .contains("Log out").should('not.exist')
      .given({ email: 'bob@gmail.com' })  // fixed fields
      .login()
```

### login()

Call login and logout in your test. For example:

```js
import { Auth0ClientOptions } from '@auth0/auth0-spa-js';
import type { Client, Scenario, Simulation } from '@simulacrum/client';
import { createClient } from '@simulacrum/client';
import config from '../../cypress.env.json';

describe('log in', () => {
  it('should get token without signing in', () => {
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
});
```

### logout()

```js
cy.logout();
```

You might want to log out after every test.

```js
afterEach(async () => {
  cy.logout();
});
```

You may also log out _before_ each test to allow one to inspect the state after a test run.

```js
beforeEach(async () => {
  cy.logout();
});
```

## debugging

It is possible to hook up express middleware to log each endpoint that is called and any associated querystring or POST data by simply adding the `debug: true` option when calling `createSimulation`:

e.g.

```js
it("should log in and log out", () => {
  cy
    .createSimulation({ ...auth0Config, debug: true })
```

![debug console output](./docs/out.png)
