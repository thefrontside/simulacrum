[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Created by Frontside](https://img.shields.io/badge/created%20by-frontside-26abe8.svg)](https://frontside.com)
[![Chat on Discord](https://img.shields.io/discord/700803887132704931?Label=Discord)](https://discord.gg/XT5EYHcNaq)

# Simulacrum

A simulation platform to supercharge acceptance testing, enable high-fidelity application previews, and free up development teams to make progress independently.

Modern applications have modern dependencies. Whether they run on the server or in the browser, they rely on external services to get their jobs done. But along with the power to focus our business logic and distribute it across so many different points comes a fundamental weakness: The entire experience, from development, to testing, to continuous integration is coupled to the very in-the-moment states of actual deployments. This becomes problematic when those deployments are down, rate limited, under active development, or not functioning as expected in any way.

Simulacrum removes these constraints from your process by allowing you to simulate external dependencies with a very high degree of reality.

## Existing Simulators

- [github-api](packages/github-api) - [@simulacrum/github-api-simulator](https://www.npmjs.com/package/@simulacrum/github-api-simulator)
- [auth0](packages/auth0) - [@simulacrum/auth0-simulator](https://www.npmjs.com/package/@simulacrum/auth0-simulator)
- [ldap](packages/ldap) - [@simulacrum/ldap-simulator](https://www.npmjs.com/package/@simulacrum/ldap-simulator)

> [!WARNING]  
> The LDAP simulator will not be runnable from this branch. It is undergoing a large refactor on top of the Foundation simulator. For the previous iterations, see the `v0` branch which contain the previous functionality.

These simulators are (or will be) built on top of the Foundation simulator. This simulator gives some base level functionality which is likely to be used in every simulator.

It is built with the expectation to be extended and meet your needs for any custom simulators as well. If you need assistance in building a simulator for your needs, please reach out to [Frontside for this or any other consulting services](https://frontside.com/).

- [foundation](packages/foundation) - [@simulacrum/foundation-simulator](https://www.npmjs.com/package/@simulacrum/foundation-simulator)

## Development

```
$ npm install
$ npm run prepack
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
