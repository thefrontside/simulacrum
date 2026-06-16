# Changelog

## \[0.10.0]

### Enhancements

- [`3317d15`](https://github.com/thefrontside/simulacrum/commit/3317d1537922042db1cd9994a5916b8d75e249af) ([#365](https://github.com/thefrontside/simulacrum/pull/365) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Convert package to ESM only. All LTS are able to import ESM, both from an ESM or CJS context.
- [`b0313de`](https://github.com/thefrontside/simulacrum/commit/b0313decf4cc835b2ffd1c9e516576be166a438e) ([#370](https://github.com/thefrontside/simulacrum/pull/370) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Allow `useSimulation` to set extra `nodeArgs` for spawning a `child_process`. This enables using `--import` or other utilities such as might be required for directly executing TypeScript files on some verisons of node.

### Bug Fixes

- [`b0313de`](https://github.com/thefrontside/simulacrum/commit/b0313decf4cc835b2ffd1c9e516576be166a438e) ([#370](https://github.com/thefrontside/simulacrum/pull/370) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Fix path resolution in `useSimulation` and default to `shell: true` for `useService`.

### Dependencies

- [`b0313de`](https://github.com/thefrontside/simulacrum/commit/b0313decf4cc835b2ffd1c9e516576be166a438e) ([#370](https://github.com/thefrontside/simulacrum/pull/370) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Bump `@effectionx/process` to align and dedupe `@effectionx/context-api`.

## \[0.9.0]

- [`9ef139f`](https://github.com/thefrontside/simulacrum/commit/9ef139f80b0403b4b66163ee7005b552640394c2) ([#359](https://github.com/thefrontside/simulacrum/pull/359) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Enabling oxfmt and oxlint for more consistency.
- [`a3a8108`](https://github.com/thefrontside/simulacrum/commit/a3a8108f58e2523a3700b19900abbc53552c3e15) ([#357](https://github.com/thefrontside/simulacrum/pull/357) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Swap to pnpm within monorepo.

### New Features

- [`e81d6b9`](https://github.com/thefrontside/simulacrum/commit/e81d6b993fb64e4300588227645b162ec75c8f62) Define a graph of services and simulators to more easily run through the CLI helper or with a helper in tests.

## \[0.8.0]

- [`d3850c6`](https://github.com/thefrontside/simulacrum/commit/d3850c657ea45c9e67790b63fb4341a95818c664) ([#345](https://github.com/thefrontside/simulacrum/pull/345) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Bump server to `effection` v4. With the tight dependency fitting into an `effection` runtime, bumping with a minor despite no specific breaking changes directly in this package. Additionally, we swapped to `@effectionx/process` and pulled in some other helpers. This was to prevent edge cases which were noted as part of the upgrade.
- [`d4f2be5`](https://github.com/thefrontside/simulacrum/commit/d4f2be576503e2fd374b996c26e33682d592e5ac) ([#349](https://github.com/thefrontside/simulacrum/pull/349) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Skip simulator asset minification. Also remove usage of `String.raw`. This was breaking the `/login` view in the Auth0 simulator with the way `tsdown` was escaping the strings.

## \[0.7.2]

### Bug Fixes

- [`356bfdd`](https://github.com/thefrontside/simulacrum/commit/356bfddfd55203d0f444922e6fcef087ed461252) Fix `typesVersion` pointing to old directories. Update `tsdown`.

## \[0.7.1]

### Enhancements

- [`33efe53`](https://github.com/thefrontside/simulacrum/commit/33efe53806407c2b36d6c3c927301473bcf6fd31) ([#329](https://github.com/thefrontside/simulacrum/pull/329) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Add additional TypeScript configure in workspace to further refine type checks. Run `tsc` in CI for every package.

### Bug Fixes

- [`d035a5b`](https://github.com/thefrontside/simulacrum/commit/d035a5be52fb53621acd148e5bd2a66f613d1773) ([#325](https://github.com/thefrontside/simulacrum/pull/325) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Properly pass down `nodeOptions`. We were spreading the root options object which meant options like `cwd` were not being picked up.

## \[0.7.0]

### Enhancements

- [`9064492`](https://github.com/thefrontside/simulacrum/commit/90644922ce14e87a1daa92d31173213b8f8f0d55) ([#318](https://github.com/thefrontside/simulacrum/pull/318)) BREAKING CHANGE: Shift to helpers to allow one to more easily set up and run simulators. This provides an `effection` Operation to allow one to easily run processes through a function. This is useful for starting up simulators as required for a test.

## \[0.6.3]

- When creating a person with the person simulator, we now allow passing in a specific `id` to use.
  - [6793a27](https://github.com/thefrontside/simulacrum/commit/6793a2743ed57c79670ca95842e0202bfa5db359) change file on 2022-11-16

## \[0.6.2]

- The simulation server can return null events on shutdown, and the logger did not consider this. The previous patch fixed a single instance. This addresses the remaining three instances by checking for undefined within the filter.
  - [7a3b87a](https://github.com/thefrontside/simulacrum/commit/7a3b87aeea69128f9dff04d6a99a52b5d58d08fa) simulation filter may include null, include check on 2022-09-19

## \[0.6.1]

- The simulation server can return null events on shutdown, and the logger did not consider this. Check for undefined within the filter.
  - [43bb4cf](https://github.com/thefrontside/simulacrum/commit/43bb4cfde8884595496ecdd27f6c94ceff95765d) simulation filter may include null, include check ([#210](https://github.com/thefrontside/simulacrum/pull/210)) on 2022-08-23

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
