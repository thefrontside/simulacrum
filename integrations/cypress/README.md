# @simulacrum/auth0-cypress

A [Cypress](https://www.cypress.io/) plugin specifically created for SDK's that integrate with [Auth0](https://auth0.com)! @simulacrum/auth0-cypress will simulate an auth0 server, running on `localhost`, so you don't have to create fake Auth0 accounts while developing or running tests that require authentication!

Features:
 - No interaction with real Auth0 servers making any token request completely free!
 - Supports multiple SDK's that integrate with Auth0!
 - Create individual users for each test, each with a unique set of claims, permissions or scopes!
 - Can be run in CI/CD pipelines!
 - Works with the latest Cypress and Auth0 SDK versions!

## Contents

  * [Installation](#installation)
    * [Step 1: Install the addon](#step-1-install-the-addon)
    * [Step 2: Choose which sdk or javascript sdk (default @auth0/auth0-react)](#step-2-choose-which-sdk-or-javascript-sdk-default-auth0auth0-react)
    * [Step 3: Import the commands](#step-3-import-the-commands)
    * [Step 4: Register the encrypt task in the cypress.config.ts](#step-4-register-the-encrypt-task-in-the-cypressconfigts)
    * [Step 5: Configure Auth0](#step-5-configure-auth0)
  * [How it works](#how-it-works)
  * [Usage with start-server-and-test](#usage-with-start-server-and-test)
  * [Commands](#commands)
    * [cy.createSimulation()](#cycreatesimulation)
    * [cy.given()](#cygiven)
    * [cy.login()](#cylogin)
    * [cy.logout()](#cylogout)
  * [Troubleshooting](#troubleshooting)
    * [When running my app in Cypress, the login is successful but the app is not logged in or it redirects me to the login page:](#when-running-my-app-in-cypress-the-login-is-successful-but-the-app-is-not-logged-in-or-it-redirects-me-to-the-login-page)
  * [Debugging](#debugging)

## Installation

### Step 1: Install the addon

```sh
npm install @simulacrum/auth0-cypress --dev
```

### Step 2: Choose which sdk or javascript sdk (default @auth0/auth0-react)

This plugin supports the following javascript sdks that interface with auth0:

- [@auth0/auth0-react (default)](https://github.com/auth0/auth0-react)
- [nextjs-auth0](https://github.com/auth0/nextjs-auth0)

To set the correct SDK, you need to set the `AUTH0_SDK` environment variable inside your cypress.config.ts or through any of the [usual cypress environmental varaibles options](https://docs.cypress.io/guides/guides/environment-variables).

in the [`cypress.config.ts`](./cypress.config.ts)  file
```typescript
// integrations/cypress/cypress.config.ts
export default defineConfig({
      env: {
        // This is the SDK used to communicate with Auth0, can be either 'auth0_react' or 'nextjs_auth0'
        AUTH0_SDK: 'auth0_react',
    }
});
```

or with the use of a `.env` file (examples: [auth0-react](./.env.auth0-react), [nextjs-auth0](./.env.nextjs-auth0) [create-react-app](./.env.create-react-app))

```bash
# /integrations/cypress/.env.auth0-react
AUTH0_SDK="auth0_react"
```

### Step 3: Import the commands

```typescript
// cypress/support/commands/index.ts

import '@simulacrum/auth0-cypress';
```

### Step 4: Register the encrypt task in the cypress.config.ts

We need to register an encrypt [cypress task](https://docs.cypress.io/api/commands/task).

#### ESM

```typescript
// cypress.config.ts
import { encrypt } from '@simulacrum/auth0-cypress/encrypt';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', { encrypt });
    },
  },
});
```

#### commonjs

```typescript
// cypress.config.ts
export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const { encrypt } = require('@simulacrum/auth0-cypress/encrypt');
      on('task', { encrypt });
    },
  },
});
```

### Step 5: Configure Auth0

An example of all the possible environment variables can be found in the [cypress.config.ts](./cypress.config.ts) file. 

**NOTE: Make very sure that the values that you pass into Cypress are the EXACT same as the values you use in your application. If you use different values, the login will be successful but the app will not be logged in or it will redirect you to the login page.**

```typescript
// integrations/cypress/cypress.config.ts
export default defineConfig({
      env: {
        // This is the SDK used to communicate with Auth0, can be either 'auth0_react' or 'nextjs_auth0'
        AUTH0_SDK: 'auth0_react',
        // This is the port of the simulated Auth0 server to which the Auth0 SDK will connect
        AUTH0_SIMULATOR_PORT: 4400,
        // The intended consumer of the token
        AUTH0_AUDIENCE: 'https://thefrontside.auth0.com/api/v1/',
        // The Client ID of the Auth0 application
        AUTH0_CLIENT_ID:  "00000000000000000000000000000000",
        // The type of authentication flow used by the Auth0 SDK
        AUTH0_CONNECTION: "Username-Password-Authentication",
        // The default scope for the Auth0 user
        AUTH0_SCOPE: "openid profile email offline_access",
        // This is the secret used to sign the JWT tokens
        AUTH0_CLIENT_SECRET: '6d0598f28f62a9aee14929ef46c7c8befdc015',
        // This is the secret used to encrypt the session cookie
        AUTH0_COOKIE_SECRET: "",
        // This is the name of the session cookie used by the Cypress tests
        AUTH0_SESSION_COOKIE_NAME: "appSession",
    }
});
```
These same variables can also be set through the use of `env` files: (examples: [auth0-react](./.env.auth0-react), [nextjs-auth0](./.env.nextjs-auth0) [create-react-app](./.env.create-react-app))

```bash
# /integrations/cypress/.env.auth0-react
AUTH0_SDK="auth0_react"
AUTH0_SIMULATOR_PORT=4400
AUTH0_AUDIENCE="https://your-audience/"
AUTH0_CONNECTION="Username-Password-Authentication"
AUTH0_SCOPE="openid profile email offline_access"
AUTH0_CLIENT_ID="YOUR_AUTH0_CLIENT_ID"
AUTH0_CLIENT_SECRET='YOUR_AUTH0_CLIENT_SECRET'
AUTH0_COOKIE_SECRET='6d0598f28f62a9aee14929ef46c7c8befdc0150d870ec462fa45629511fd2a46'
```

## Step 6: Configure your localhost to use a https connection

The Auth0 SDK's require a https connection to work. This can easily be setup by using [mkcert](https://github.com/FiloSottile/mkcert) to create a self-signed certificate for your localhost. 

A running example with setting up mkcert instruction can be found here at [@simulacrum/ui](../../packages/ui/README.md#running-https-services-from-localhost)

## How it works

Under the hood, [@simulacrum/auth0-cypress](https://github.com/thefrontside/simulacrum/tree/v0/integrations/cypress) uses another package called [@simulacrum/auth0-simulator](https://github.com/thefrontside/simulacrum/tree/v0/packages/auth0) which will first start a GraphQL interface/web server (by default on localhost:4000). This will then require a mutation command to start the actual Auth0 simulation server which you will then use in the Cypress tests. This is what @simulacrum/auth0-cypress will do for you, as well add various Cypress commands.

## Usage with start-server-and-test

Cypress recommends using [start-server-and-test](https://github.com/bahmutov/start-server-and-test) to ensure the test process exits and any servers are shut down.

Make sure to follow the following convention for creating your own start command with Auth0-Cypress
```bash
npx start-server-and-test <first command> <first resource> <second command> <second resource> <test command>
```
As example: 
```bash
# This will start the server and test commands in parallel
npx start-server-and-test \
# This will start the application server that will be tested against in Cypress
'npm run start:server' http://localhost:3000 \
# This will start the Auth0 simulator GraphQL server
'npm run start:auth0' http://localhost:4000 \ ##
# This will start the Cypress tests
cypress open
```

See the scripts section in [package.json](./package.json) for various examples on the use of integrating with`start-server-and-test` command.

The following commands are now available in your test suite:

## Commands
An example of these commands in use can be found in the [login.spec.ts](./cypress/e2e/login.cy.ts) file.

- [cy.createSimulation()](#cycreatesimulation)
- [cy.given()](#cygiven)
- [cy.login()](#cylogin)
- [cy.logout()](#cylogout)

### cy.createSimulation()

`createSimulation` creates the fake auth0 server with your configuration

```ts
describe('tests requiring auth', () =>
{
    it('should access restricted resource', () => {
        cy.createSimulation(); // Will use the default configuration set in cypress.config.ts
        // OR
        cy.createSimulation({ options }); // Will use the options passed in to start the simulated Auth0 server
    });
})
  
```
### cy.given()

`given` creates a fake user that can be used to log into the fake auth0 server.

#### create random user

```ts
describe('tests requiring auth', () =>
{
  it('should access restricted resource', () => {
    cy
      .createSimulation({ options })
      .given() // with no arguments a random user is created
      .login();
  });
})
```

#### supply fixed fields

```ts
describe('tests requiring auth', () =>
{
  it('should access restricted resource', () => {
    cy
      .createSimulation()
      .given({ email: 'bob@gmail.com' })  // fixed fields
      .login();
  });
})
```

### cy.login()

Depending on the SDK that has been configured, a token will be requested through the use of [getTokenSilently()](https://auth0.com/docs/libraries/auth0-single-page-app-sdk#get-access-token-with-no-interaction). Which will set the token in the local storage of the browser.

Call login and logout in your test. For example:

```typescript
describe('log in', () => {
  it('should get token without signing in', () => {
    cy
      .createSimulation({ options })
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

### cy.logout()
`cy.logout` will destroy the simulation and do any clean up between tests like removing cookies.

```typescript
cy.logout();
```


## Troubleshooting

### When running my app in Cypress, the login is successful but the app is not logged in or it redirects me to the login page:

Make VERY sure that the Auth0 env variable values you're using, are the EXACT same as the variables you're passing into Cypress. 

## Debugging

It is possible to hook up express middleware to log each endpoint that is called and any associated querystring or POST data by simply adding the `debug: true` option when calling `createSimulation`:

```typescript
describe('debug auth0 server', () => {
  it("should log in and log out", () => {
    cy.createSimulation({ debug: true })
  });
});
```

![debug console output](./docs/out.png)
