# Changelog

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
