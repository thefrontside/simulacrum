# `@simulacrum/github-api-simulator`

This simulator aims to mimic the _real_ GitHub API and OAuth functionality. This enables one to try out functionality locally and write tests hitting the simulator.

Imagine writing a bot for a GitHub App or creating a frontend app to query information. Testing it with the real API is possible initially, but becomes more difficult as your requirements evolve. Without access to change the underlying data on the real API, it is onerous to setup up all the organizations, accounts, repositories, and data to try out your functionality. And then you have to _reset_ it _every_ time you want to try it again.

The idea is decoupling "mock data" from a specific test, and putting it in a "prod-like" setup where we can change a URL config, etc, to go from fake data to production endpoints. We don't muddy up production code-paths with `isLocal` and then the data you write is useful both in local dev, tests run locally, and tests run in CI.

With this type of abstraction, we are able to share the effort. The effort previously put into mocks can scale outside that single test, test suite and even outside of the project. With the `github-api-simulator`, we can all maintain and expand the simulator.

## Usage

See the examples folder for setting this up in your project. Depending on your test setup and use cases, this simulation server will need to run alongside your development server in your project. The default configuration of the simulation server can be run with the `bin` script after it is installed.

If you are using a client such as `octokit.js`, you will need to override the default URL to point at the locally running simulation instance. The following is an example for setting up a GitHub `App` instance with `octokit.js`.

```js
const ghBaseUrl = "http://localhost:3300";
const app = new App({
  appId,
  privateKey,
  webhooks: { secret: webhookSecret },
  Octokit: Octokit.defaults({
    baseUrl: ghBaseUrl,
  }),
});
```

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

To generate a fake private key as required for a GitHub App, you may run the following command in your terminal with `openssl` already installed. It should be available by default on Mac systems for example.

```shell
openssl genrsa 2048
```

It may produce an `RSA PRIVATE KEY` as follows which you will pair with additional fake information such as the application ID, client ID and secret, and a webhook secret.

```yml
appId: 1337
clientId: github_app_client_id
clientSecret: github_app_client_secret
webhookSecret: github_app_webhook_secret
# Note that this is a real generated private key,
#  but it is only used here in simulation and no where else.
#  It is typical for this key to be checked at runtime during startup,
#  and will fail if it is not a valid key.
privateKey: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfQQ80IT2n7HCJ
  j8DfrkxiOiSy9r4fjWvGS7cCYfC8hvEcpMPmHr1+SASZiMdquAiQZKQXmqn0rtfe
  m76/yaSoN4dxo0BG86xeRS7S9d7Yk+Xhh7DkKuiz4A02I9iD/W04LkOV30jSPcGm
  KY4m6u1NrlIXTed4wlVWTqKXMF1wdLfZ4xYRJJ11m30PWCibPiHCfzx1xEXnXQuy
  +f2tWNa8ra9uICKOwA8z87KJe1zdF/VFwKZvCb5otyzPzyik7ZPuA/9qtjckTJun
  aR9M6apou1FAQ7V19xoFrJfCWszc4UBRZUYOkVDRyZMX/fCJZJsvMXbpay/0pMmM
  1s8WfelTAgMBAAECggEAJ81PWvSJ39vInqDmkCEUZyJoBLCFgQZL7uICid5nl/7T
  6RhG+88oBhVCzQqx6Hq5bTkyB9I4cvZ17mWXjYB8nixOtjiaeoExTdhVpRUdTpzc
  QfszWztcMISpWKQp24ct0nJBowYMwbr8mKZfKFvj1lvgmYF3fid3w5vgqA/G8rFb
  1VqiDGMEUcVbdVSKdk6DBtkJ/OQeaRDY/12PfYhfRnkErat4bUY4akiOudi1/88t
  zPuQWpKZaXoUpjsGmxslC6NBz6cZhbHlrA3jdt3sCILeLBA0nmJJKGNXHHBqkw7l
  +5odXx9NkwWmuBGXixT4P68GDyKj4nrk/HfdbgsOnQKBgQDeCZyC3PaRuBYFlB0F
  J3Fi/jfsLwlnWEk9EWomvpe6b59QJ2zP3JP4ERjbt8SIPyWFJN8r36/rzqUYddHw
  /yY7wR59UpNUGL2h4LNh38CD6t6qbOH5wRHE8pGeuYYcDu9zDRuv9t37DkRVuO8U
  k+siREATcyJz18ilvTJb4qD73QKBgQC3nQUa/aXzWKeq+Bnr8oHCKRQjVdmBgcvX
  UVH3KKW7JNhe3+uAQmWkbMYlU543gNGtYoqjG6fgJrf/g0drhOYHuhw6JXAtx6KF
  rr3P63B76CKFAUdzIW9YnKim//H0ztP5AVx9hwZ20otk1vQLoCFrZ2EMV4XGUxjW
  NrxLSWx+7wKBgQC7EtwEQgmY0sHzJ0ygGBBneItDeonwwajLRA3s4O5TjVJsJRt/
  sngVLMqF7LowlQuWt280tv2wruXYywP8iez7sYVvz5AD7ehwKDLbBrtcKho6+wwV
  8r528m0Qj31XzJmglO27/0IeEXIvy2XcL5iPwXM/L+VaNvd99P8l/bbnHQKBgBdt
  d3tMJeJ4y1vrMBOE672EVEd16ry1fPbKL3UjwJGyT9E7LOc+kY17O4UDuEpIq3g9
  /IZ3PuJAznVRoMk9OcR+oJ9iq3+L21bHRvzCg6Wrpsvlr+Imv/hEdNhqC8s6oJ1C
  6TQzCEYc8yA4tQbOtbToid9zQ2RcseyTK09H3QoNAoGAL9lROuhFByJ8THKf7SbB
  7OlSVzyuJN0xkbpGE4A9j6efrW2RlDl95AkN/IaOelJRyjqRb6sDgmgy8GzdpUfk
  WttUTyTtj9cJisYVGYaSAm8sBZeXYVv1tb7S61R2l6lk2IXRy/QGGsNiwlV6uq32
  7AtbjufCx1NzlYX5Q0NNGzg=
  -----END PRIVATE KEY-----
```
