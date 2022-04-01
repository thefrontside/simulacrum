# Changelog

## \[0.3.2]

- Add cosmiconfig and zod to @simulacrum/auth0-simulator
  - Bumped due to a bump in @simulacrum/server.
  - [3dfacdc](https://github.com/thefrontside/simulacrum/commit/3dfacdcf84ca55a7f965dd297675245efb794f69) Add Cosmiconfig and zod to @simulacrum/auth0-config ([#190](https://github.com/thefrontside/simulacrum/pull/190)) on 2022-04-01

## \[0.3.1]

- add `log` option to LDAP simulator options to enabled/disable logging
  - [83a59fe](https://github.com/thefrontside/simulacrum/commit/83a59fe3361f333187e5275bfaf1da440fbd6c65) Add changeset on 2022-03-15

## \[0.3.0]

- add low-level `createLDAPServer()` resource that lets you embed an LDAP server
  into any Effection program as an resource.
  - [a470277](https://github.com/thefrontside/simulacrum/commit/a47027705cb8976dc97f5b274a3582b8c665dadb) Allow LDAP server to be standalone a resource on 2022-03-15

## \[0.2.3]

- apply @typescript/consistent-types
  - [746a2ab](https://github.com/thefrontside/simulacrum/commit/746a2ab46333ff836808dd4d1bf8e98f2a20afae) Eslint consitent types ([#181](https://github.com/thefrontside/simulacrum/pull/181)) on 2022-02-22

## \[0.2.2]

- Simplify createSimulation and destroySimulation by removing them from the effects.
  - Bumped due to a bump in @simulacrum/server.
  - [04d5aaf](https://github.com/thefrontside/simulacrum/commit/04d5aaf0077d744badd8739936aad328156d64e2) Simplify createSimulation and destroySimulation ([#174](https://github.com/thefrontside/simulacrum/pull/174)) on 2022-01-19
- wait for simulation to be destroyed before creating a new one
  - Bumped due to a bump in @simulacrum/server.
  - [b1412da](https://github.com/thefrontside/simulacrum/commit/b1412daa2d7846ec4c8eefeea2dfbf94e19b7261) wait for simulation to be destroyed before creating a new one ([#171](https://github.com/thefrontside/simulacrum/pull/171)) on 2022-01-18

## \[0.2.1]

- Update eslint-config and typescript versions
  - Bumped due to a bump in @simulacrum/client.
  - [f852573](https://github.com/thefrontside/simulacrum/commit/f852573daefaf3da2675b1233c3c2db38a2b43ba) update eslint-config and typescript on 2021-10-26

## \[0.2.0]

- Add an ldap processor implementation.
  - [8e0c460](https://github.com/thefrontside/simulacrum/commit/8e0c4608c40243f15299eede6c3539bb1b82ff87) Simple LDAP Simulator ([#154](https://github.com/thefrontside/simulacrum/pull/154)) on 2021-10-19
