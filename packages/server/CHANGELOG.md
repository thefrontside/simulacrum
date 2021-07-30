# Changelog

## \[0.3.1]

- rollback effection to beta-5.
  - Bumped due to a bump in @simulacrum/client.
  - [793c074](https://github.com/thefrontside/simulacrum/commit/793c074c73d4958a9db5231b7ffdd54b5f103d4a) rollback effection to beta-5 on 2021-07-30

## \[0.3.0]

- upgrade to effection@2.0.0-beta.6
  - [6c7387b](https://github.com/thefrontside/simulacrum/commit/6c7387bc9740e62a032e7133a18cff2888d38858) upgrade to effection@2.0.0-beta.6 on 2021-07-28
- Add the ability to create https services
  - [deab6be](https://github.com/thefrontside/simulacrum/commit/deab6beec9ff27b3b43874d711433b696adeeccb) add changeset on 2021-06-09
- Add a `use` function to `createHttpApp` that adds express middleware that are operations.
  - [0400220](https://github.com/thefrontside/simulacrum/commit/0400220c37c36ae0f523e927d2198dc5888ef6df) add middleware test on 2021-06-09
- a `services` field added to the `createSimulation` options argument where a port can be assigned.
  - [211637e](https://github.com/thefrontside/simulacrum/commit/211637e2c650b1f6590bda9ff30a2538ed2e8a0e) add changeset on 2021-06-16
  - [093ad85](https://github.com/thefrontside/simulacrum/commit/093ad85ae80a0ccd13f6e69ac4d2ee964aeebe83) add service options to createSimulation options on 2021-06-24
- Add the ability to add scenario parameters and basic passive effects implementation.
  - [a5bcb89](https://github.com/thefrontside/simulacrum/commit/a5bcb89ae54f05ce873ea9e2f2218cd3f33597bd) add changeset on 2021-05-28

## \[0.2.0]

- require a single root simulator for each simulation
  - [0cf5eb5](https://github.com/thefrontside/simulacrum/commit/0cf5eb5983dc20ab05c8e59bdc77b18603b526c8) Only one top-level simulator in a simulation on 2021-04-16

## \[0.1.0]

- Add destroySimulation()
  - [72f3490](https://github.com/thefrontside/simulacrum/commit/72f3490fb5d33cdfd039c31cb5eab06ddd00afcd) add changeset on 2021-04-12
- create proper npm packages that actually work
  - [87b30c4](https://github.com/thefrontside/simulacrum/commit/87b30c45b502f31747918610bed3604afd21bba9) Make a proper release on 2021-04-16

## \[0.0.2]

- Provide a decent implementation of createClient() that can create
  simulations and scenarios
  - Bumped due to a bump in @simulacrum/client.
  - [3bab6c4](https://github.com/thefrontside/simulacrum/commit/3bab6c4fca23cfc112db207b4ab5da5657b59a25) add changeset on 2021-04-07
  - [e79cf3e](https://github.com/thefrontside/simulacrum/commit/e79cf3e2f0f8428a202e0b7f8525f716550e429d) fix(covector): remove nicknames and pin all deps on 2021-04-08

## \[0.0.1]

- Initial Release
  - [32f3870](https://github.com/thefrontside/simulacrum/commit/32f3870a5fcc65d726348f20a71ca51c2b77422d) change file on 2021-04-01
