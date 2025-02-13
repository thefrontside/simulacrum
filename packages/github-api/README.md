# `@simulacrum/github-api-simulator`

This simulator aims to mimic the _real_ GitHub API and OAuth functionality. This enables one to try out functionality locally and write tests hitting the simulator.

Imagine writing a bot for a GitHub App or creating a frontend app to query information. Testing it with the real API is possible initially, but becomes more difficult as your requirements evolve. Without access to change the underlying data on the real API, it is onerous to setup up all the organizations, accounts, repositories, and data to try out your functionality. And then you have to _reset_ it _every_ time you want to try it again.

The idea is decoupling "mock data" from a specific test, and putting it in a "prod-like" setup where we can change a URL config, etc, to go from fake data to production endpoints. We don't muddy up production code-paths with `isLocal` and then the data you write is useful both in local dev, tests run locally, and tests run in CI.

With this type of abstraction, we able to share the effort. The effort previously put into mocks can scale outside that single test, test suite and even outside of the project. With the `github-api-simulator`, we can all maintain and expand the simulator.

## Usage

See the examples folder for setting this up in your project. Depending on your test setup and use cases, this simulation server will need to run alongside your development server in your project. The default configuration of the simulation server can be run with the `bin` script after it is installed.

It is built on `@simulaction/foundation-simulator` where we can pull in the GH OpenAPI spec and use their embedded examples to build upon. Every REST endpoint will be handled will return some response.

## API

It may be run directly from the `bin` script.

```shell
npx @simulacrum/github-api-simulator
```

If you need deeper control and want to input data, import the server and run it with a Nodejs script. It exports a named function, `simulation`, which you may use to start the server.

```js
import { simulation } from "@simulacrum/github-api-simulator";

let app = simulation();
app.listen(3300, () =>
  console.log(`github-api simulation server started at http://localhost:3300`)
);
```

It accepts an `{ initialState }` arg which allows one to define deeper data for the REST endpoints, and is required for GraphQL. You may additionaly `{ extend }` and provide more custom handling for your unique situation. This can also be used as a pattern to test updates to the simulator within your own setup prior to opening and discussing a pull request. It uses the `@simulacrum/foundation-simulator` which can referred to for documentation to `extend`.

## Authentication and Authorization

The simulator doesn't verify any tokens or permissions passed to it. This enables easily querying as needed. However, many systems are built with the expectation to undergo an Authenication flow as a first step. If this your situation, we recommend generating fake credentials that are valid, but not actually used in any environment. You may then commit these to the repository for use in any tests or local development.

This simulator should handle any of the authentication flows and return responses which Octokit or similar would consider valid. From there, you may proceed to query as normal.
