# Changelog

## \[0.0.21]

- Add the `refresh_token` flow
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [7e4e918](https://github.com/thefrontside/simulacrum/commit/7e4e918b83484116021b06eeb0f5407ea3458628) Refresh token ([#252](https://github.com/thefrontside/simulacrum/pull/252)) on 2023-02-11

## \[0.0.20]

- The auth0-simulator `/login/callback` is difficult to inspect. We need the `client_id` passed, but it seems safe to pass the whole `wctx` object as query strings.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [6b18117](https://github.com/thefrontside/simulacrum/commit/6b18117093e650713fe00d5b0614ba085186db9f) /login/callback should pass all wctx ([#241](https://github.com/thefrontside/simulacrum/pull/241)) on 2022-11-30
- The auth0-simulator userData does not consider the Auth0 email verification functionality. Set it to `true` as a default to enable minimal functionality.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [547ef7f](https://github.com/thefrontside/simulacrum/commit/547ef7f3a9f7d99023078ff18307bed2b30223af) default auth0 simulator userData email_verified to true on 2022-11-29
- The login form needs `event.preventDefault()` to allow the Auth0 library functions to run instead of default form functionality.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [046f49f](https://github.com/thefrontside/simulacrum/commit/046f49f3603a7865f3e62c84d81851637971f97f) add event.preventDefault() to login form for submit event on 2022-11-29
- The auth0-simulator uses a logger that was refactored and broke the middleware logging. As a stopgap to the required, involved refactor, log out based on the debug flag.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [67e2f7f](https://github.com/thefrontside/simulacrum/commit/67e2f7f18d90a2fa53f2f216291ee770aab60440) add stopgap debug in auth0-simulator ([#237](https://github.com/thefrontside/simulacrum/pull/237)) on 2022-11-30

## \[0.0.19]

- Added specific support for the `grant_type` `client_credentials` which is required for machine-to-machine tokens. This grant_type specifically does not run the rules. The `scope` option now accepts an array of objects to specify specific scopes for specific clients.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [4ffde63](https://github.com/thefrontside/simulacrum/commit/4ffde63842c0984f7bf5d6b3bd0f3d98ad938799) support client_credentials grant_type on 2022-11-17
  - [9bb1b43](https://github.com/thefrontside/simulacrum/commit/9bb1b43bb80332e5357123550d72eef8681ae416) update change file with note about scope adjustments on 2022-11-23
- Tweaks the login form so the button is a true form submission button. This allows the form to input validate, and enables all form submission options (enter primarily the addition).
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [fa4a9e2](https://github.com/thefrontside/simulacrum/commit/fa4a9e27f72b6609419ee93d3c55b620a5feb6bc) auth0 submit as form button on 2022-11-21
- The simulator should consider the audience and client_id passed in the request. The values may be important for logic in user defined rules, and is used in validating the token, e.g. in `auth0-react`.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [86cd7d0](https://github.com/thefrontside/simulacrum/commit/86cd7d06d5747c81d31a241726999955425a8e65) consider client_id and audience in auth0 sim request on 2022-11-16

## \[0.0.18]

- Async rules were not properly processing and would run as a race condition mutating the `user` and `context` objects. This would mean part of the rule might be applied. This adds some additional wrappers in the rule running to properly handle and `await` on async code.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [013b5db](https://github.com/thefrontside/simulacrum/commit/013b5dbf12d1995efe1fb6fba90b55d3fe05f523) change file on 2022-11-03

## \[0.0.17]

- export `createAuth0Server` operation for running Auth0 server standalone.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [cd2f869](https://github.com/thefrontside/simulacrum/commit/cd2f8695ef8f4d4088a7fd37a8383fb7cc0d8c49) Export standalone Auth0 creation function on 2022-11-01

## \[0.0.16]

- The auth0 simulator `/userinfo` endpoint will fall back to check for the `access_token` query parameter if the authorization header is not set.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [e3c55cd](https://github.com/thefrontside/simulacrum/commit/e3c55cdb3b0087a7e1be95d4c68674074956dfa2) change file on 2022-10-27
- The auth0 simulator `/oauth/token` endpoint passes the user data through which is important as input for rules.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [f039985](https://github.com/thefrontside/simulacrum/commit/f039985b8768aa0c447b9304f2a624170f5e5782) pass user data at /oauth/token on 2022-10-31

## \[0.0.15]

- now exports a `createAuth0Server` operation which can be used directly without
  starting a Simulacrum server
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [875def0](https://github.com/thefrontside/simulacrum/commit/875def0277a9c6d6d1f5ea05d8dbffcfcc65d1a2) Add change entry on 2022-10-01

## \[0.0.14]

- The simulation server can return null events on shutdown, and the logger did not consider this. Check for undefined within the filter.
  - Bumped due to a bump in @simulacrum/server.
  - [43bb4cf](https://github.com/thefrontside/simulacrum/commit/43bb4cfde8884595496ecdd27f6c94ceff95765d) simulation filter may include null, include check ([#210](https://github.com/thefrontside/simulacrum/pull/210)) on 2022-08-23

## \[0.0.13]

- add missing @simulacrum/client to auth0 package
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [6b0c7d1](https://github.com/thefrontside/simulacrum/commit/6b0c7d1cdca0f19455b5e9017216520bcae06ff2) add missing @simulacrum/client to auth0 package ([#205](https://github.com/thefrontside/simulacrum/pull/205)) on 2022-04-20

## \[0.0.12]

- Add cosmiconfig as a dependency to the auth0-simulator
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [7bd03b4](https://github.com/thefrontside/simulacrum/commit/7bd03b4313bd34a498c06bf8823f9e1559df4d38) add cosmiconfig as a dependency to @simularcurm/auth0-simulator ([#203](https://github.com/thefrontside/simulacrum/pull/203)) on 2022-04-20

## \[0.0.11]

- Add cosmiconfig and zod to @simulacrum/auth0-simulator
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [3dfacdc](https://github.com/thefrontside/simulacrum/commit/3dfacdcf84ca55a7f965dd297675245efb794f69) Add Cosmiconfig and zod to @simulacrum/auth0-config ([#190](https://github.com/thefrontside/simulacrum/pull/190)) on 2022-04-01

## \[0.0.10]

- Make the iat field epoch time.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [6e08689](https://github.com/thefrontside/simulacrum/commit/6e086899eaf085d1e12e2c8edfea56139d8b705b) make iat field epoch time ([#187](https://github.com/thefrontside/simulacrum/pull/187)) on 2022-03-15

## \[0.0.9]

- apply @typescript/consistent-types
  - Bumped due to a bump in @simulacrum/server.
  - [746a2ab](https://github.com/thefrontside/simulacrum/commit/746a2ab46333ff836808dd4d1bf8e98f2a20afae) Eslint consitent types ([#181](https://github.com/thefrontside/simulacrum/pull/181)) on 2022-02-22

## \[0.0.8]

- Simplify createSimulation and destroySimulation by removing them from the effects.
  - Bumped due to a bump in @simulacrum/server.
  - [04d5aaf](https://github.com/thefrontside/simulacrum/commit/04d5aaf0077d744badd8739936aad328156d64e2) Simplify createSimulation and destroySimulation ([#174](https://github.com/thefrontside/simulacrum/pull/174)) on 2022-01-19
- wait for simulation to be destroyed before creating a new one
  - Bumped due to a bump in @simulacrum/server.
  - [b1412da](https://github.com/thefrontside/simulacrum/commit/b1412daa2d7846ec4c8eefeea2dfbf94e19b7261) wait for simulation to be destroyed before creating a new one ([#171](https://github.com/thefrontside/simulacrum/pull/171)) on 2022-01-18

## \[0.0.7]

- Enable @simulacrum/auth0-cypress to run against nextjs-auth0.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [79a6f11](https://github.com/thefrontside/simulacrum/commit/79a6f11e6a5d516314182d5466f0d9657465c92e) Get user tokens ([#162](https://github.com/thefrontside/simulacrum/pull/162)) on 2022-01-04
- Update eslint-config and typescript versions
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [f852573](https://github.com/thefrontside/simulacrum/commit/f852573daefaf3da2675b1233c3c2db38a2b43ba) update eslint-config and typescript on 2021-10-26

## \[0.0.6]

- Add @simulacrum/auth0-cypress package
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [cb1ce68](https://github.com/thefrontside/simulacrum/commit/cb1ce68e6892532e1a4da82f736baaefe5ea2c09) update config.json on 2021-08-04
  - [d0d2b33](https://github.com/thefrontside/simulacrum/commit/d0d2b33be40aaec3c2496a2439f9b3539df3b081) fix changes file auth0 reference on 2021-08-09
  - [5ddc11e](https://github.com/thefrontside/simulacrum/commit/5ddc11e8a533241b4db3883595e0b2badcd05a9c) rename remaining cypress-auth0 => auth0-cypress on 2021-08-12
- Upgrade to effection 2.0
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [993857e](https://github.com/thefrontside/simulacrum/commit/993857e98b2d74a2cfbca255c5b82573f2db7a80) Upgrade to Effection 2.0 on 2021-10-12
- - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [d0f1cc1](https://github.com/thefrontside/simulacrum/commit/d0f1cc192fd1266bbb1eef2e644f8042546e060b) Upgrade effection to latest buffer / stream APIs on 2021-09-30
- Upgrade effection to 2.0.0-beta.15
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [938e9bf](https://github.com/thefrontside/simulacrum/commit/938e9bfcabfcdc5806ecba01a909432b3de29971) Upgrade effection on 2021-09-07

## \[0.0.5]

- Increment all of the `effection` and related `@effection` packages. There was an issue in `@effection/core` with `dist` assets and this ensures it won't exist in the user's lock file.
  - Bumped due to a bump in @simulacrum/client.
  - [30d575b](https://github.com/thefrontside/simulacrum/commit/30d575bc652a5329d67568b013f657691d1d86b6) upgrade past @effection/core dist issue on 2021-08-13

## \[0.0.4]

- Fix bug where person scenario was not passing parameters down
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [cfe6862](https://github.com/thefrontside/simulacrum/commit/cfe68622e3609336e0cde6ea40c3d144710c3734) Transparently pass through person scenario on 2021-08-05
- fix malformed token that had `mail` field, not `email` field
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [da75afd](https://github.com/thefrontside/simulacrum/commit/da75afdd0b5c47901e05ae7df5a4f968d0d2d613) add changefile on 2021-08-05
- Add a `debug` option to server that will log errors when
  createSimulation() fails
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [7db8e11](https://github.com/thefrontside/simulacrum/commit/7db8e110f5d262f37d7dbf670d10a98cfe29f066) add changeset on 2021-07-15
  - [c2525dc](https://github.com/thefrontside/simulacrum/commit/c2525dcab303cc37a638c7cefe180ef9926ab9ee) remove redundant task.halt from logging effect on 2021-07-27
  - [6c2f83e](https://github.com/thefrontside/simulacrum/commit/6c2f83e5b183906a0a45ec6f3b8c8b06369dbfdb) add description to change file on 2021-07-30

## \[0.0.3]

- rollback effection to beta-5.
  - Bumped due to a bump in @simulacrum/client.
  - [793c074](https://github.com/thefrontside/simulacrum/commit/793c074c73d4958a9db5231b7ffdd54b5f103d4a) rollback effection to beta-5 on 2021-07-30

## \[0.0.2]

- Fix auth0-simulator dependencies in examples
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [e2ba50a](https://github.com/thefrontside/simulacrum/commit/e2ba50ae8371dea129d5e981d91da93c07fd5e5c) Fix auth0-simulator dependencies in examples on 2021-07-30

## \[0.0.1]

- Add example using nextjs and nextjs-auth0 making use of the auth0 simulator.
  - [aeb1a10](https://github.com/thefrontside/simulacrum/commit/aeb1a10493b933d1e537cfdf859ae0b28a831f42) update example readmes, CSB link and change files on 2021-07-16
