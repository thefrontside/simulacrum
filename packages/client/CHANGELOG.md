# Changelog

## \[0.5.4]

- apply @typescript/consistent-types
  - [746a2ab](https://github.com/thefrontside/simulacrum/commit/746a2ab46333ff836808dd4d1bf8e98f2a20afae) Eslint consitent types ([#181](https://github.com/thefrontside/simulacrum/pull/181)) on 2022-02-22

## \[0.5.3]

- Update eslint-config and typescript versions
  - [f852573](https://github.com/thefrontside/simulacrum/commit/f852573daefaf3da2675b1233c3c2db38a2b43ba) update eslint-config and typescript on 2021-10-26

## \[0.5.2]

- Upgrade to effection 2.0
  - [993857e](https://github.com/thefrontside/simulacrum/commit/993857e98b2d74a2cfbca255c5b82573f2db7a80) Upgrade to Effection 2.0 on 2021-10-12
- - [d0f1cc1](https://github.com/thefrontside/simulacrum/commit/d0f1cc192fd1266bbb1eef2e644f8042546e060b) Upgrade effection to latest buffer / stream APIs on 2021-09-30
- Upgrade effection to 2.0.0-beta.15
  - [938e9bf](https://github.com/thefrontside/simulacrum/commit/938e9bfcabfcdc5806ecba01a909432b3de29971) Upgrade effection on 2021-09-07

## \[0.5.1]

- Increment all of the `effection` and related `@effection` packages. There was an issue in `@effection/core` with `dist` assets and this ensures it won't exist in the user's lock file.
  - [30d575b](https://github.com/thefrontside/simulacrum/commit/30d575bc652a5329d67568b013f657691d1d86b6) upgrade past @effection/core dist issue on 2021-08-13

## \[0.5.0]

- rollback effection to beta-5.
  - [793c074](https://github.com/thefrontside/simulacrum/commit/793c074c73d4958a9db5231b7ffdd54b5f103d4a) rollback effection to beta-5 on 2021-07-30

## \[0.4.0]

- Automatically detect platform (nodejs, browser) and use appropriate
  WebSocket library
  - [fc7f579](https://github.com/thefrontside/simulacrum/commit/fc7f579d4cd31f498de9b39f5f0e02b6379ce109) Add changeset on 2021-05-29
- upgrade to effection@2.0.0-beta.6
  - [6c7387b](https://github.com/thefrontside/simulacrum/commit/6c7387bc9740e62a032e7133a18cff2888d38858) upgrade to effection@2.0.0-beta.6 on 2021-07-28

## \[0.3.0]

- require a single root simulator for each simulation
  - [0cf5eb5](https://github.com/thefrontside/simulacrum/commit/0cf5eb5983dc20ab05c8e59bdc77b18603b526c8) Only one top-level simulator in a simulation on 2021-04-16

## \[0.2.0]

- Add destroySimulation()
  - [72f3490](https://github.com/thefrontside/simulacrum/commit/72f3490fb5d33cdfd039c31cb5eab06ddd00afcd) add changeset on 2021-04-12
- create proper npm packages that actually work
  - [87b30c4](https://github.com/thefrontside/simulacrum/commit/87b30c45b502f31747918610bed3604afd21bba9) Make a proper release on 2021-04-16

## \[0.1.0]

- Provide a decent implementation of createClient() that can create
  simulations and scenarios
  - [3bab6c4](https://github.com/thefrontside/simulacrum/commit/3bab6c4fca23cfc112db207b4ab5da5657b59a25) add changeset on 2021-04-07
  - [e79cf3e](https://github.com/thefrontside/simulacrum/commit/e79cf3e2f0f8428a202e0b7f8525f716550e429d) fix(covector): remove nicknames and pin all deps on 2021-04-08

## \[0.0.1]

- Initial Release
  - [32f3870](https://github.com/thefrontside/simulacrum/commit/32f3870a5fcc65d726348f20a71ca51c2b77422d) change file on 2021-04-01
