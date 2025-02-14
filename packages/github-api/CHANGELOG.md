# Changelog

## \[0.5.4]

### Enhancements

- [`e920b0d`](https://github.com/thefrontside/simulacrum/commit/e920b0dc4803cd228650f27aa52e693b4d662e43) All existing custom routes, repository and installations endpoints, now return a 404 in cases where there are no associated resources to match the real API functionality.

## \[0.5.3]

### Bug Fixes

- [`e565f7b`](https://github.com/thefrontside/simulacrum/commit/e565f7b9f32390cd18d38001650a9e4c757fd608) *Possibly breaking* We incorrectly used the hosted schema with an Enterprise endpoint. Correcting this to default to the hosted endpoint with the hosted schema. Use `apiUrl` and `apiSchema` if there is need to adjust for Enterprise use cases.

## \[0.5.2]

### Bug Fixes

- [`85816d8`](https://github.com/thefrontside/simulacrum/commit/85816d831839a1f525415adc9a24bad4eebd88b5) Validate and correct responses with OpenAPI specification for `/installation/repositories`, `/orgs/{org}/repos`, `/repos/{org}/{repo}/branches`, `orgs/{org}/installation`, and `/repos/{owner}/{repo}/installation` when passing in `initialState`.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.3.0`

## \[0.5.1]

### Bug Fixes

- [`2741f00`](https://github.com/thefrontside/simulacrum/commit/2741f00faef7d7ac0af317261699e7b98cf72300) The bin file was not specified so running with `npx` directly was broken.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.2.1`

## \[0.5.0]

### Enhancements

- [`7d39c71`](https://github.com/thefrontside/simulacrum/commit/7d39c71164bf42f3c0ca90a428ccf03532a40eb4) Rebuilding on top of the foundation simulator to establish a mutable state. Also begin handling REST-based routes.

## \[0.4.0]

- [`955dd7f`](https://github.com/thefrontside/simulacrum/commit/955dd7f248f6f1352b6be10327dda48a0ffcea58)([#267](https://github.com/thefrontside/simulacrum/pull/267)) Adds the `repositoryOwner` resolver.

## \[0.3.3]

- [`d38705a`](https://github.com/thefrontside/simulacrum/commit/d38705aaa34ce10a9a57ed418a277c7aa777fb97)([#265](https://github.com/thefrontside/simulacrum/pull/265)) Adding the isArchived and defaultBranchRef as options to return in the query.

## \[0.3.2]

### Bug Fixes

- [`1040a8f`](https://github.com/thefrontside/simulacrum/commit/1040a8f11d9534eebaa1620c0bd9b8b884291d53)([#263](https://github.com/thefrontside/simulacrum/pull/263)) A `repository` query would fail due to a destructured `name`. This fixes the reference and adds an additional check for matching `nameWithOwner`.

## \[0.3.1]

### Dependencies

- [`70eedc3`](https://github.com/thefrontside/simulacrum/commit/70eedc311329078b65fd57afd9112dceeed0319e)([#260](https://github.com/thefrontside/simulacrum/pull/260)) Bump the version of graphgen to 1.8.1 to support the latest type signature expected from the factory that is passed to the server.

## \[0.3.0]

- Allow extenstion of github api simulator with new endpoints and middleware
  - [b065a10](https://github.com/thefrontside/simulacrum/commit/b065a10ad6f5cb53a70453f1e8d3f0065b5e2210) Add changeset on 2023-05-05

## \[0.2.4]

- Added the description mapping to repositories.
  - [ba0046e](https://github.com/thefrontside/simulacrum/commit/ba0046ec563023ce023e0264346a15d34d304de7) add the description mapping to Github API simulator ([#256](https://github.com/thefrontside/simulacrum/pull/256)) on 2023-03-02

## \[0.2.3]

- add repository mock data to github-api-simulator
  - [62e3948](https://github.com/thefrontside/simulacrum/commit/62e394877d4e726dca692b4dcfc8af2bcf6d03e1) add repository mock data to github-api-simulator ([#247](https://github.com/thefrontside/simulacrum/pull/247)) on 2022-12-05

## \[0.2.2]

- export World and Factory types
  - [1c70396](https://github.com/thefrontside/simulacrum/commit/1c703967c972f9a363727607becd29c1c7b9992e) export World and Factory types ([#245](https://github.com/thefrontside/simulacrum/pull/245)) on 2022-12-01

## \[0.2.1]

- Fix path resolution to github api schema
  - [995b6bb](https://github.com/thefrontside/simulacrum/commit/995b6bbea77480ac3233926f1c9b046130fdeac2) Fix path resolution to github api schema ([#243](https://github.com/thefrontside/simulacrum/pull/243)) on 2022-11-30

## \[0.2.0]

- create the @simulacrum/github-api-simulator package
  - [0eb4ebf](https://github.com/thefrontside/simulacrum/commit/0eb4ebf7d24b1e06cbba2ccc9f9e247f55b52e60) add changeset on 2022-11-30
