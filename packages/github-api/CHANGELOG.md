# Changelog

## \[0.6.4]

- [`86957dd`](https://github.com/thefrontside/simulacrum/commit/86957dd0e8ecd8a6bc536fd289df5e393c1774e3) ([#352](https://github.com/thefrontside/simulacrum/pull/352) by [@a-kriya](https://github.com/thefrontside/simulacrum/../../a-kriya)) preserve user-provided id in initialState instead of overwriting

## \[0.6.3]

- [`d4f2be5`](https://github.com/thefrontside/simulacrum/commit/d4f2be576503e2fd374b996c26e33682d592e5ac) ([#349](https://github.com/thefrontside/simulacrum/pull/349) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Skip simulator asset minification. Also remove usage of `String.raw`. This was breaking the `/login` view in the Auth0 simulator with the way `tsdown` was escaping the strings.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.6.1`

## \[0.6.2]

### Bug Fixes

- [`a78fa61`](https://github.com/thefrontside/simulacrum/commit/a78fa610a0d3a5f5f3e15dce739b6c4c6174141e) ([#341](https://github.com/thefrontside/simulacrum/pull/341) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Use the `extend` options and properly pass the `extendRouter` that will allow the user to add or change route handling. Closes #317.
- [`7c120ed`](https://github.com/thefrontside/simulacrum/commit/7c120ed2820b11ce3fa3fba7219c890252687e11) ([#315](https://github.com/thefrontside/simulacrum/pull/315) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Better handle nested owners which previously threw errors, e.g. map() of undefined. Also accept the custom header as used by the `@octokit/graphql` package.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.6.0`
- [`16ceab1`](https://github.com/thefrontside/simulacrum/commit/16ceab115b027bbcffb44b4b7becd3869304e8f5) ([#337](https://github.com/thefrontside/simulacrum/pull/337) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Export helpers from foundation simulator for use in dumping data into the stores, such as in the GitHub API simulator.

## \[0.6.1]

### Bug Fixes

- [`356bfdd`](https://github.com/thefrontside/simulacrum/commit/356bfddfd55203d0f444922e6fcef087ed461252) Fix `typesVersion` pointing to old directories. Update `tsdown`.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.5.1`

## \[0.6.0]

### Enhancements

- [`c52b964`](https://github.com/thefrontside/simulacrum/commit/c52b9649ad7505bf41e43a640d05d6ee5b9b73a7) ([#322](https://github.com/thefrontside/simulacrum/pull/322) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) POSSIBLY BREAKING: Switch to ESM modules with a dual published CJS option. This was enabled by swapping out lodash for defu to merge OpenAPI specifications.
- [`95bc2cf`](https://github.com/thefrontside/simulacrum/commit/95bc2cf102839e7f869498f0bf9d7e3f0dce7d84) ([#323](https://github.com/thefrontside/simulacrum/pull/323) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) POSSIBLY BREAKING: Update the express v5. If you are using the extended router, you may need to confirm your routes against the express v5 migration guide.
- [`33efe53`](https://github.com/thefrontside/simulacrum/commit/33efe53806407c2b36d6c3c927301473bcf6fd31) ([#329](https://github.com/thefrontside/simulacrum/pull/329) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Add additional TypeScript configure in workspace to further refine type checks. Run `tsc` in CI for every package.
- [`6b452c3`](https://github.com/thefrontside/simulacrum/commit/6b452c3cf3c8bd5f025a1993cf4ad63a5597e242) ([#320](https://github.com/thefrontside/simulacrum/pull/320) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Switch to using `tsdown` to help build both ESM and CJS versions of the package. This also includes helpers to ensure that the published package has all of the required properties and configuration.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.5.0`

## \[0.5.7]

### Bug Fixes

- [`dd8a08c`](https://github.com/thefrontside/simulacrum/commit/dd8a08cebc1c527e358d187b1292844bc864b190) Add extensions to all imports including bare `/index` imports. With an updated version of TypeScript, this allowed a build which correctly added extensions to every relative import improving compatibility with Node and file resolution.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.4.1`

## \[0.5.6]

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.4.0`

## \[0.5.5]

### Bug Fixes

- [`ade6ca6`](https://github.com/thefrontside/simulacrum/commit/ade6ca69238094d96236bdfbbe06285cb80bf100) The `/user/memberships/orgs` endpoint didn't return data per the schema. Fix and validate.

## \[0.5.4]

### Enhancements

- [`e920b0d`](https://github.com/thefrontside/simulacrum/commit/e920b0dc4803cd228650f27aa52e693b4d662e43) All existing custom routes, repository and installations endpoints, now return a 404 in cases where there are no associated resources to match the real API functionality.

### Bug Fixes

- [`0ba82b7`](https://github.com/thefrontside/simulacrum/commit/0ba82b7720f54dbc7faf99a0e2da2ef9212caff5) Change the default simulation helper page to `/simulation` to avoid the conflict with the default GitHub route at the root, `/`.

### Dependencies

- Upgraded to `@simulacrum/foundation-simulator@0.3.1`

## \[0.5.3]

### Bug Fixes

- [`e565f7b`](https://github.com/thefrontside/simulacrum/commit/e565f7b9f32390cd18d38001650a9e4c757fd608) _Possibly breaking_ We incorrectly used the hosted schema with an Enterprise endpoint. Correcting this to default to the hosted endpoint with the hosted schema. Use `apiUrl` and `apiSchema` if there is need to adjust for Enterprise use cases.

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
