[![CircleCI](https://circleci.com/gh/thefrontside/simulacrum.svg?style=shield)](https://circleci.com/gh/thefrontside/simulacrum)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Created by Frontside](https://img.shields.io/badge/created%20by-frontside-26abe8.svg)](https://frontside.com)
[![Chat on Discord](https://img.shields.io/discord/700803887132704931?Label=Discord)](https://discord.gg/XT5EYHcNaq)

# Simulacrum

A simulation platform to supercharge acceptance testing, enable high-fidelity application previews, and free up development teams to make progress independently.

Modern applications have modern dependencies. Whether they run on the server or in the browser, they rely on external services to get their jobs done. But along with the power to focus our business logic and distribute it across so many different points comes a fundamental weakness: The entire experience, from development, to testing, to continuous integration is coupled to the very in-the-moment states of actual deployments. This becomes problematic when those deployments are down, rate limited, under active development, or not functioning as expected in any way.

Simulacrum removes these constraints from your process by allowing you to simulate external dependencies with a very high degree of reality.

## Existing Simulators

* [auth0](packages/auth0) - [@simulacrum/auth0-simulator](https://www.npmjs.com/package/@simulacrum/auth0-simulator)
* [ldap](packages/ldap) - [@simulacrum/ldap-simulator](https://www.npmjs.com/package/@simulacrum/ldap-simulator)

## Usage

Simulacrum is based on a client server architecture. The server can hold any number of simulations which you can create and control via the client. The following examples use JavaScript, but under the hood it is just connects over HTTP and so can be used from any language.

To create a simulation in a simulacrum server with one of its available simulators. In this case, we'll assume that there is an `auth0` simulator on the server that we can use to create a simulation.

``` javascript
import { Client, createClient } from '@simulacrum/client';

let client = createClient('http://localhost:4000');
let simulation = await client.createSimulation("auth0");
// =>
// services:{
//   auth0:{
//     port: 4400 
//   }
// }
//
```

The resulting simulation has a list of service endpoints that you can use to configure whatever things needed for `auth0`.

To create a user that you can log in as, you would run the `person` scenario. This will create a person with realistic data.

``` javascript
let person = await client.given(simulation, "person");
person.name // => Paul Waters
person.email // => paul.waters@gmail.com
```

If you have an application that uses `auth0`, check out [`@simulacrum/auth0-simulator`](./packages/auth0) on how you can get started.

We also have complete examples for [`nextjs with auth0 react`](./examples/nextjs-with-auth0-react) and [`nextjs with nextjs auth0`](./examples/nextjs-with-nextjs-auth0).

## Development

```
$ npm install
$ npm run build
$ npm test
```

<!--
## Testing

current problems:
* massive carve-outs for stubbing
* static tapes (dead fish)
* no isolation when running tests against a shared instance

## Application Previews

## Concurrent development across all application teams.
-->
