# Changelog

## \[0.6.2]

- add missing @simulacrum/client to auth0 package
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [6b0c7d1](https://github.com/thefrontside/simulacrum/commit/6b0c7d1cdca0f19455b5e9017216520bcae06ff2) add missing @simulacrum/client to auth0 package ([#205](https://github.com/thefrontside/simulacrum/pull/205)) on 2022-04-20

## \[0.6.1]

- Add cosmiconfig as a dependency to the auth0-simulator
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [7bd03b4](https://github.com/thefrontside/simulacrum/commit/7bd03b4313bd34a498c06bf8823f9e1559df4d38) add cosmiconfig as a dependency to @simularcurm/auth0-simulator ([#203](https://github.com/thefrontside/simulacrum/pull/203)) on 2022-04-20

## \[0.6.0]

- Add cosmiconfig and zod to @simulacrum/auth0-simulator
  - [3dfacdc](https://github.com/thefrontside/simulacrum/commit/3dfacdcf84ca55a7f965dd297675245efb794f69) Add Cosmiconfig and zod to @simulacrum/auth0-config ([#190](https://github.com/thefrontside/simulacrum/pull/190)) on 2022-04-01

## \[0.5.2]

- Make the iat field epoch time.
  - Bumped due to a bump in @simulacrum/auth0-simulator.
  - [6e08689](https://github.com/thefrontside/simulacrum/commit/6e086899eaf085d1e12e2c8edfea56139d8b705b) make iat field epoch time ([#187](https://github.com/thefrontside/simulacrum/pull/187)) on 2022-03-15

## \[0.5.1]

- apply @typescript/consistent-types
  - [746a2ab](https://github.com/thefrontside/simulacrum/commit/746a2ab46333ff836808dd4d1bf8e98f2a20afae) Eslint consitent types ([#181](https://github.com/thefrontside/simulacrum/pull/181)) on 2022-02-22

## \[0.5.0]

- have specific cypress commands for specific auth0 javascript sdks.
  - [175a0f4](https://github.com/thefrontside/simulacrum/commit/175a0f47357f682c470c6df47ae3d3be92687f0e) Auth0 cypress provider ([#172](https://github.com/thefrontside/simulacrum/pull/172)) on 2022-01-19
- Make all clientId variables use clientID casing
  - [5863e14](https://github.com/thefrontside/simulacrum/commit/5863e14d35166cbfce7c87d1acc96e3a2137ea3d) Make all clientId variables use clientID casing ([#173](https://github.com/thefrontside/simulacrum/pull/173)) on 2022-01-17

## \[0.4.0]

- Make encrypt typescript and exportable after transpilation
  - [4446e54](https://github.com/thefrontside/simulacrum/commit/4446e54539f7f75dbaed160a99fb6c77758c67f6) Make encrypt typescript ([#167](https://github.com/thefrontside/simulacrum/pull/167)) on 2022-01-11

## \[0.3.1]

- Give default values to the cypress environment variables.
  - [22adebf](https://github.com/thefrontside/simulacrum/commit/22adebf310772f6df15474851ec8382739d15bb4) create defaults for auth0-cypress environment variables ([#165](https://github.com/thefrontside/simulacrum/pull/165)) on 2022-01-11

## \[0.3.0]

- Simplify cypress logging
  - [9b9d82f](https://github.com/thefrontside/simulacrum/commit/9b9d82f27795f745cd9d23b7d16f42ed0c204b3d) simplify cypress logging ([#163](https://github.com/thefrontside/simulacrum/pull/163)) on 2022-01-06
- Enable @simulacrum/auth0-cypress to run against nextjs-auth0.
  - [79a6f11](https://github.com/thefrontside/simulacrum/commit/79a6f11e6a5d516314182d5466f0d9657465c92e) Get user tokens ([#162](https://github.com/thefrontside/simulacrum/pull/162)) on 2022-01-04
- Add debug option to createSimulation to add express middleware logging
  - [9df79b5](https://github.com/thefrontside/simulacrum/commit/9df79b53e0891d0d3c7946abd450240d4c6cd032) Add debug option to createSimulation to add express middleware logging on 2021-11-25
- Update eslint-config and typescript versions
  - [f852573](https://github.com/thefrontside/simulacrum/commit/f852573daefaf3da2675b1233c3c2db38a2b43ba) update eslint-config and typescript on 2021-10-26
- Destroy simulation before creating a new one
  - [5473a01](https://github.com/thefrontside/simulacrum/commit/5473a01f22a3ccae8186ab8b1c7e785a1be9bdfb) Rerun cypress tests ([#164](https://github.com/thefrontside/simulacrum/pull/164)) on 2022-01-06

## \[0.2.2]

- specify typeRoots for @simulacrum/auth0-cypress cypress package
  - [53e4cef](https://github.com/thefrontside/simulacrum/commit/53e4cef4fd30cc78b53d95e148f29dee519c4aa9) specify typeRoots for @simulacrum/auth0-cypress cypress package on 2021-10-19

## \[0.2.1]

- move ./src dir to ./cypress
  - [3d7d9ff](https://github.com/thefrontside/simulacrum/commit/3d7d9ffb4154faf49aeb62932b786e74665bbbe2) add changeset on 2021-10-19
- remove cypress paths
  - [760293c](https://github.com/thefrontside/simulacrum/commit/760293c2b6a04e7475ecca93804c63a34fa95304) remove cypress paths on 2021-10-18
  - [bd96e40](https://github.com/thefrontside/simulacrum/commit/bd96e40d5717e7d86807d6a6457bbb4f0505747c) add changeset on 2021-10-18

## \[0.2.0]

- Add includes to tsconfigs.
  - [f5a5bfa](https://github.com/thefrontside/simulacrum/commit/f5a5bfac4d60280d8aaa26a0c7ff33b58104f7a3) add includes to cypress tsconfigs on 2021-10-18
  - [5dc4f5f](https://github.com/thefrontside/simulacrum/commit/5dc4f5f719c3bdc014fdedf80130fd8ace3feccf) add changeset on 2021-10-18

## \[0.1.0]

- Add @simulacrum/auth0-cypress package
  - [cb1ce68](https://github.com/thefrontside/simulacrum/commit/cb1ce68e6892532e1a4da82f736baaefe5ea2c09) update config.json on 2021-08-04
  - [d0d2b33](https://github.com/thefrontside/simulacrum/commit/d0d2b33be40aaec3c2496a2439f9b3539df3b081) fix changes file auth0 reference on 2021-08-09
  - [5ddc11e](https://github.com/thefrontside/simulacrum/commit/5ddc11e8a533241b4db3883595e0b2badcd05a9c) rename remaining cypress-auth0 => auth0-cypress on 2021-08-12
