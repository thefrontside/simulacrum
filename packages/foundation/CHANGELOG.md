# Changelog

## \[0.6.1]

- [`d4f2be5`](https://github.com/thefrontside/simulacrum/commit/d4f2be576503e2fd374b996c26e33682d592e5ac) ([#349](https://github.com/thefrontside/simulacrum/pull/349) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Skip simulator asset minification. Also remove usage of `String.raw`. This was breaking the `/login` view in the Auth0 simulator with the way `tsdown` was escaping the strings.

## \[0.6.0]

- [`7dc3615`](https://github.com/thefrontside/simulacrum/commit/7dc36151f5feeb69909800ce5325742541cac642) ([#335](https://github.com/thefrontside/simulacrum/pull/335) by [@cowboyd](https://github.com/thefrontside/simulacrum/../../cowboyd)) Don't explicitly run simulation on "localhost" as the host parameter. This allows responses when addressed via `::1` (ipv6) and `0.0.0.0` in
  ipv4 for example depending on system configuration. Allow the user to instead pass all properties that the Node `http` and `https` expect, including a port and host for cases where explicit control is required.

### New Features

- [`121b301`](https://github.com/thefrontside/simulacrum/commit/121b3013400cd7387bc62cf122f0ef1ff78b0353) ([#338](https://github.com/thefrontside/simulacrum/pull/338) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Add tasks to handle generic functions that would run in an `effection` scope. This enables the ability to handle webhooks. A webhook is an action that can be triggered directly and makes a `POST` to a specified endpoint, but can also watch and trigger on updates to the store.

### Dependencies

- [`16ceab1`](https://github.com/thefrontside/simulacrum/commit/16ceab115b027bbcffb44b4b7becd3869304e8f5) ([#337](https://github.com/thefrontside/simulacrum/pull/337) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Export helpers from foundation simulator for use in dumping data into the stores, such as in the GitHub API simulator.

## \[0.5.1]

### Bug Fixes

- [`3465b2b`](https://github.com/thefrontside/simulacrum/commit/3465b2be92d47ecc432fe5ecc4a7cc5337c6298c) ([#332](https://github.com/thefrontside/simulacrum/pull/332) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Fix handling of simulation route log for extended routes which changed and broke in the upgrade to express v5. It changed where the nesting of that route information.
- [`356bfdd`](https://github.com/thefrontside/simulacrum/commit/356bfddfd55203d0f444922e6fcef087ed461252) Fix `typesVersion` pointing to old directories. Update `tsdown`.

## \[0.5.0]

### Enhancements

- [`c52b964`](https://github.com/thefrontside/simulacrum/commit/c52b9649ad7505bf41e43a640d05d6ee5b9b73a7) ([#322](https://github.com/thefrontside/simulacrum/pull/322) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) POSSIBLY BREAKING: Switch to ESM modules with a dual published CJS option. This was enabled by swapping out lodash for defu to merge OpenAPI specifications.
- [`95bc2cf`](https://github.com/thefrontside/simulacrum/commit/95bc2cf102839e7f869498f0bf9d7e3f0dce7d84) ([#323](https://github.com/thefrontside/simulacrum/pull/323) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) POSSIBLY BREAKING: Update the express v5. If you are using the extended router, you may need to confirm your routes against the express v5 migration guide.
- [`33efe53`](https://github.com/thefrontside/simulacrum/commit/33efe53806407c2b36d6c3c927301473bcf6fd31) ([#329](https://github.com/thefrontside/simulacrum/pull/329) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Add additional TypeScript configure in workspace to further refine type checks. Run `tsc` in CI for every package.
- [`6b452c3`](https://github.com/thefrontside/simulacrum/commit/6b452c3cf3c8bd5f025a1993cf4ad63a5597e242) ([#320](https://github.com/thefrontside/simulacrum/pull/320) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Switch to using `tsdown` to help build both ESM and CJS versions of the package. This also includes helpers to ensure that the published package has all of the required properties and configuration.
- [`ec6991f`](https://github.com/thefrontside/simulacrum/commit/ec6991f28624cecdf7828fdf1977c6e18747932a) ([#324](https://github.com/thefrontside/simulacrum/pull/324) by [@jbolda](https://github.com/thefrontside/simulacrum/../../jbolda)) Upgrade to `starfx@0.15.0`. This settles out and upgrades upstream dependencies. You may see `reselect` warnings now showing in your terminal for items with broken memoization.

## \[0.4.1]

### Bug Fixes

- [`dd8a08c`](https://github.com/thefrontside/simulacrum/commit/dd8a08cebc1c527e358d187b1292844bc864b190) Add extensions to all imports including bare `/index` imports. With an updated version of TypeScript, this allowed a build which correctly added extensions to every relative import improving compatibility with Node and file resolution.

## \[0.4.0]

### New Features

- [`774c860`](https://github.com/thefrontside/simulacrum/commit/774c860d91896c1cfdad64b283dcab836b57441d) Now allows setting the server as https with a certificate applied in the home directory. Use the `protocol` to enable the search for the SSL certificate.

## \[0.3.1]

### Enhancements

- [`0ba82b7`](https://github.com/thefrontside/simulacrum/commit/0ba82b7720f54dbc7faf99a0e2da2ef9212caff5) Add API to pass in a page route for the default simulation helper page. This allows for those services which define a valid route returned at the root.

### Bug Fixes

- [`34ecabd`](https://github.com/thefrontside/simulacrum/commit/34ecabdbb483f494fdff25b2b7a352bdba1079cc) Fix `exports` in `package.json` and `tsconfig.json` with ESM for improved compatibility with `pnpm`.

## \[0.3.0]

### New Features

- [`07e0560`](https://github.com/thefrontside/simulacrum/commit/07e0560b3289a34dfc1a971aa983e16928cb64bc) Based on handler `return` versus `response.status().json()` and the new `verbose` option, log out or return 502 on failed validation of response data based on OpenAPI schema.
- [`07e0560`](https://github.com/thefrontside/simulacrum/commit/07e0560b3289a34dfc1a971aa983e16928cb64bc) Add `verbose` option to enable contextual logging for debugging purposes.

## \[0.2.1]

### Bug Fixes

- [`6a6fc71`](https://github.com/thefrontside/simulacrum/commit/6a6fc716cfdb7ae50baea6504e25c389acbeeb8f) Due to upstream dep requirements, the `react-redux` depends on `react-dom`. Including it as a dependency to resolve this issue, but we will work to remove it from the dependency chain as that code path is not utilized in this library.

## \[0.2.0]

### New Features

- [`ab1c616`](https://github.com/thefrontside/simulacrum/commit/ab1c61663582bed118cecb61ed3321227ad0eb3f) All routes now add a log to the simulation state on every visit. This assists in tracking hits on each simulation route.
- [`ad2dbc9`](https://github.com/thefrontside/simulacrum/commit/ad2dbc97b5068b4662ae8d95f188ae9dac80be0c) To improve transparency and flexibility, we now include a page at the root that lists all of the routes, and the ability to signal which response to return.
- [`f20a3a6`](https://github.com/thefrontside/simulacrum/commit/f20a3a6d69c265683f75005ed3687d6ff5fd6497) ([#283](https://github.com/thefrontside/simulacrum/pull/283)) We now support serving a directly of JSON files through file path routing. Use `serveJsonFiles` to specify the folder which contains the files to serve.

### Enhancements

- [`209ffa5`](https://github.com/thefrontside/simulacrum/commit/209ffa55bfd3532b2771e3bfb03ef771d1a05eed) Add API to configure a delay of all responses with a set interval. Using this in a simulator would enable a feel closer to a real external endpoint.
- [`e9c7fed`](https://github.com/thefrontside/simulacrum/commit/e9c7fed73a2a5fa7ba26c6823dab2aadc48f8ceb) Add option the proxy to real API and save JSON responses in `./src/serve` directory.

## \[0.1.0]

- [`58ae1d9`](https://github.com/thefrontside/simulacrum/commit/58ae1d9d5719775a7595ec9bbf55b2c015a892bf) This simulator is a base to iteratively build a simulator for use in published simulators in `@simulacrum` scope or custom implementations elsewhere. This includes the components likely to be used in each simulator (server, router, data store) and pieces to enable quickly spinning up a simulator to get started as through an OpenAPI spec.
