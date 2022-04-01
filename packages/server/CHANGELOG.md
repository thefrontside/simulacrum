# Changelog

## \[0.6.0]

- Add cosmiconfig and zod to @simulacrum/auth0-simulator
  - [3dfacdc](https://github.com/thefrontside/simulacrum/commit/3dfacdcf84ca55a7f965dd297675245efb794f69) Add Cosmiconfig and zod to @simulacrum/auth0-config ([#190](https://github.com/thefrontside/simulacrum/pull/190)) on 2022-04-01

## \[0.5.1]

- apply @typescript/consistent-types
  - [746a2ab](https://github.com/thefrontside/simulacrum/commit/746a2ab46333ff836808dd4d1bf8e98f2a20afae) Eslint consitent types ([#181](https://github.com/thefrontside/simulacrum/pull/181)) on 2022-02-22

## \[0.5.0]

- Simplify createSimulation and destroySimulation by removing them from the effects.
  - [04d5aaf](https://github.com/thefrontside/simulacrum/commit/04d5aaf0077d744badd8739936aad328156d64e2) Simplify createSimulation and destroySimulation ([#174](https://github.com/thefrontside/simulacrum/pull/174)) on 2022-01-19
- wait for simulation to be destroyed before creating a new one
  - [b1412da](https://github.com/thefrontside/simulacrum/commit/b1412daa2d7846ec4c8eefeea2dfbf94e19b7261) wait for simulation to be destroyed before creating a new one ([#171](https://github.com/thefrontside/simulacrum/pull/171)) on 2022-01-18

## \[0.4.1]

- Update eslint-config and typescript versions
  - [f852573](https://github.com/thefrontside/simulacrum/commit/f852573daefaf3da2675b1233c3c2db38a2b43ba) update eslint-config and typescript on 2021-10-26

## \[0.4.0]

- Upgrade to effection 2.0
  - [993857e](https://github.com/thefrontside/simulacrum/commit/993857e98b2d74a2cfbca255c5b82573f2db7a80) Upgrade to Effection 2.0 on 2021-10-12
- Add basic logging middleware component.
  - [7ea8803](https://github.com/thefrontside/simulacrum/commit/7ea8803081e3ecc9cdbe20fe61a9e5d248d556a8) add basic logging middleware ([#135](https://github.com/thefrontside/simulacrum/pull/135)) on 2021-10-18
- Create a new ResouceServiceCreator interface for a more generic way of creating services.
  - [4fe7646](https://github.com/thefrontside/simulacrum/commit/4fe76466480dbd21eeadf15d8910f47bd17c3ffb) add changeset on 2021-10-05
- - [d0f1cc1](https://github.com/thefrontside/simulacrum/commit/d0f1cc192fd1266bbb1eef2e644f8042546e060b) Upgrade effection to latest buffer / stream APIs on 2021-09-30
- Upgrade effection to 2.0.0-beta.15
  - [938e9bf](https://github.com/thefrontside/simulacrum/commit/938e9bfcabfcdc5806ecba01a909432b3de29971) Upgrade effection on 2021-09-07
- Fix #127. Wait until simulation server is fully stopped in `destroySimulation` request
  - [b80d20f](https://github.com/thefrontside/simulacrum/commit/b80d20fa0acbe2e2f69e180fefebd2b2554da8e9) wait until simulation server is fully stopped on 2021-10-05

## \[0.3.2]

- Increment all of the `effection` and related `@effection` packages. There was an issue in `@effection/core` with `dist` assets and this ensures it won't exist in the user's lock file.
  - [30d575b](https://github.com/thefrontside/simulacrum/commit/30d575bc652a5329d67568b013f657691d1d86b6) upgrade past @effection/core dist issue on 2021-08-13
- Ignore simulation service requests if the simulation has already been
  shut down
  - [11d7b63](https://github.com/thefrontside/simulacrum/commit/11d7b63340105e7fc6f340d02c6114ac8381c53f) 🐛Ignore requests in the event that the scope is not running on 2021-08-11

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
