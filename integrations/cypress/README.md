# @simulacrum/cypress

## Contents

- [Installation](#installation)
- [Usage](#usage)
  - [login()](#login)
  - [logout()](#logout)
  - [Security considerations](#security-considerations)
- [Contributing](#contributing)

## Installation

### Step 1: Install the addon

```sh
npm install @simulacrum/cypress --dev
```

### Step 2: Import the commands

```js
// cypress/support/index.js

import '@simulacrum/cypress';
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

If you want multiple test users, it's recommended to include their credentials in `cypress.env.json` rather than in your source code.

### logout()

```js
cy.logout();
```

| Property | Type | Default value | Required? |
|------|------|------|------|
| `returnTo` | `String` | None | No |

Call `logout()` anywhere in a test. For example:

```js
context('Logging out', () => {

  it('should logout', () => {
    cy.login().then(() => {
      cy.visit('/');

      cy.request('/api/me').then(({ body: user }) => {
        expect(user.email).to.equal(Cypress.env('auth0Username'));
      });

      cy.logout();

      cy.request('/api/me', {
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401); // Assert user is logged out
      });
    });
  });

});
```

You can pass a return URL to `logout()`, which the user will be taken to after a successful logout:

```js
context('Logging out', () => {

  it('should logout', () => {
    cy.login().then(() => {
      cy.visit('/');

      cy.logout('/thanks-for-visiting');
    });
  });
});
```

You may want to logout after every test:

```js
// cypress/support.index.js

import '@simulacrum/cypress';

beforeEach(() => {
  cy.logout();
})
```

### Security considerations

#### Use separate tenants

[Auth0 recommends you use a separate tenant for each environment](https://auth0.com/docs/dev-lifecycle/setting-up-env) (e.g. `development`, `testing`, `production`, etc). This will help mitigate the risk of creating test users.

Therefore, if you don't have a dedicated tenant for your `testing` environment, it's recommended you create a new tenant and update its setting to match your `development` environment before following [the installation steps](#installation).

#### Storing credentials

Put test credentials in `cypress.env.json` or a similar place that you can keep out of source control.

If you use `cypress.env.json`, add the file to your `.gitignore` and `.npmignore` files as follows:

```sh
# .gitignore

cypress.env.json
```

#### Continuous integration

If you use a platform for some of all of CI, like [Travis](https://travis-ci.org/), you will need to keep any sensitive data outside your test logs.

For [more info on how to prevent 'leaky' Travis logs, see here](https://docs.travis-ci.com/user/best-practices-security/).

## Contributing

To contribute to this addon, clone the repo:

```sh
git clone https://github.com/sir-dunxalot/@simulacrum/cypress.git
```

Install dependencies:

```sh
yarn install
```

Run the dummy app server:

```sh
yarn dev
```

Finally, run the test suite (while the dummy app server is running):

```sh
yarn test:ui # or yarn test:headless for no UI
```

To run the test suites locally you will need to pass some environment variables to Next.js and Cypress...

The easiest way to do this is to add the following two files (they're excluded from source control), but you can also pass their contained environment variables in another way (e.g. `export CYPRESS_auth0ClientId=FNfof292fnNFwveldfg9222rf`):

- `cypress.env.json`
- `cypress/dummy/.env`

To get values for these environment variables you can:

- Open an PR and then ask @sir-dunxalot to share test credentials
- Use values from your own Auth0 test tenant and app (since these files are not check in to source control)
- Create a new (free tier) tenant and application in Auth0 and set it up as documented in [the installation steps](#installation)

If you use your own Auth0 tenant, notice that you need two test users (for `auth0Username` and `auth0UsernameAlt`).

Here are the Cypress environment variables (e.g. in `cypress.env.json`):

```json
// cypress.env.json

{
  "auth0Audience": "https://lyft.auth0.com/api/v2/",
  "auth0Domain": "lyft.auth0.com",
  "auth0ClientId": "FNfof292fnNFwveldfg9222rf",
  "auth0ClientSecret": "FNo3i9f2fbFOdFH8f2fhsooi496bw4uGDif3oDd9fmsS18dDn",
  "auth0CookieSecret": "DB208FHFQJFNNA28F0N1F8SBNF8B20FBA0BXSD29SSJAGSL12D9922929D",
  "auth0Password": "mysupersecurepassword",
  "auth0PasswordAlt": "anothersupersecurepassword",
  "auth0Scope": "openid profile email",
  "auth0SessionCookieName": "appSession",
  "auth0Username": "testuser@lyft.com",
  "auth0UsernameAlt": "testuser@lyft.com"
}
```

Here are the Next.js app variables (e.g. in `cypress/dummy/.env`).

```sh
# cypress/dummy/.env

AUTH0_CLIENT_SECRET='FNo3i9f2fbFOdFH8f2fhsooi496bw4uGDif3oDd9fmsS18dDn'
AUTH0_SECRET='DB208FHFQJFNNA28F0N1F8SBNF8B20FBA0BXSD29SSJAGSL12D9922929D'

AUTH0_CLIENT_ID='FNfof292fnNFwveldfg9222rf'
AUTH0_AUDIENCE='https://lyft.auth0.com/api/v2/'
AUTH0_SCOPE='openid profile email'
AUTH0_ISSUER_BASE_URL='https://lyft.auth0.com'
AUTH0_BASE_URL='http://localhost:3000'
```

When you open a PR or push to a branch of this repo, Travis will run tests. You don't need to worry about adding environment variables since they've been added as [Travis environment variables](https://docs.travis-ci.com/user/environment-variables/) already.


## Releasing

Project collaborators will build the project and release it using the `yarn release` command, which passes any params to [the release-it package](https://github.com/release-it/release-it/).

For example:

```sh
yarn release patch # e.g. 1.0.0 --> 1.0.1
yarn release minor # e.g. 1.0.0 --> 1.1.0
yarn release major # e.g. 1.0.0 --> 2.0.0
yarn release 1.2.4 # e.g. 1.0.0 --> 1.2.4
```