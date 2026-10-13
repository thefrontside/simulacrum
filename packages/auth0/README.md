# Auth0 simulator

Read about this simulator on our blog: [Simplified Local Development and Testing with Auth0 Simulation](https://frontside.com/blog/2022-01-13-auth0-simulator/).

## Table of Contents

- [Auth0 simulator](#auth0-simulator)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [Using Default User](#using-default-user)
    - [Code](#code)
    - [Example](#example)
  - [Configuration](#configuration)
    - [Options](#options)
    - [Actions](#actions)
    - [Rules](#rules)
  - [Endpoints](#endpoints)

Please read the [main README](../../README.md) for more background on simulacrum.

The auth0 simulator has been initially written to mimic the responses of a real auth0 server that is called from auth0 client libraries like [auth0/react](https://auth0.com/docs/quickstart/spa/react/01-login) and [auth0-spa-js](https://github.com/auth0/auth0-spa-js) that use the OpenID [authorization code flow](https://developer.okta.com/docs/concepts/oauth-openid/).

If this does not meet your needs then please create a github issue to start a conversation about adding new OpenID flows.

## Quick Start

This quick start assumes you have your own app with Auth0.

> [!IMPORTANT]  
> The Auth0 clients expect the server to be served as `https`, and will throw an error if it is served as `http`. Currently, we rely on a certificate available in the home directory. On first run, you will see instructions on how to set up this certificate through `mkcert`.

### Using Default User

You may start a server directly from the command line.

```bash
npx @simulacrum/auth0-simulator  # this will start a simulation server at http://localhost:4400
```

Given no further input, it will use the default values as below. This will point your app at the simulation instead of the Auth0 endpoint.

```json
{
  "domain": "https://localhost:4400",
  "clientId": "00000000000000000000000000000000",
  "audience": "https://thefrontside.auth0.com/api/v1/"
}
```

You now have a running auth0 server!

### Code

You may import and run the simulation server in a script.

```js
import { simulation } from "@simulacrum/auth0-simulator";

const app = simulation();
app.listen(4400, () => console.log(`auth0 simulation server started at https://localhost:4400`));
```

By passing an `initialState`, you may control the initial users in the store.

```js
const app = simulation({
  initialState: {
    users: [
      {
        id: "auth0|alice",
        name: "Alice",
        email: "alice@example.com",
        password: "12345",
        user_metadata: { theme: "dark" },
        app_metadata: { roles: ["admin"] },
        logins_count: 3, // optional, defaults to 0
      },
    ],
  },
});
```

### Example

The folks at Auth0 maintain many samples such as [github.com/auth0-samples/auth0-react-samples](https://github.com/auth0-samples/auth0-react-samples). Follow the instructions to run the sample, set the configuration in `auth_config.json` to match the defaults as noted above, and run the Auth0 simulation server with `npx auth0-simulator`.

## Configuration

The Auth0 Simulator uses [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) to load the configuration options. This provides many options in where to place your configuration. Using the module name, `auth0Simulator`, you could, for example, set your configuration in a `.auth0Simulatorrc.json` file.

### Options

The `options` field supports the [auth0 configuration fields](https://auth0.com/docs/quickstart/spa/vanillajs#configure-auth0). The option fields should match the fields in the client application that is calling the auth0 server.

The `scope` also accepts an array of objects containing `clientId`, `scope` and optionally `audience` to enable dynamic scopes from a single simulator. This should allow multiple clients to all use the same simulator. Additionally, setting the `clientId: "default"` will enable a default fallback scope so every client does not need to be included.

An optional [`actions` field](#actions) lists [Auth0 Actions](https://auth0.com/docs/customize/actions) to run after login, more on this [below](#actions).

An optional [`rulesDirectory` field](#rules) can specify a directory of [auth0 rules](https://auth0.com/docs/rules) code files, more on this [below](#rules).

### Actions

Post-login [Actions](https://auth0.com/docs/customize/actions/explore-triggers/post-login) run in the order given by the `actions` option, like the bindings of Auth0's post-login trigger. Each entry has either a `file` (relative to the current working directory) or the `code` itself, and optionally the action's `secrets`:

```js
const app = simulation({
  options: {
    actions: [
      { file: "auth0/actions/post-login.js", secrets: { NAMESPACE: "https://example.com" } },
    ],
  },
});
```

An action is the same CommonJS source you deploy to Auth0, exporting `onExecutePostLogin`:

```js
exports.onExecutePostLogin = async (event, api) => {
  let { organisation_id } = event.user.app_metadata;
  api.accessToken.setCustomClaim(`${event.secrets.NAMESPACE}/organisation_id`, organisation_id);
};
```

Actions run on every login and refresh token exchange through `/oauth/token`, after any [rules](#rules). The simulator provides this subset of the post-login trigger:

- `event`: `user` (including `user_metadata` and `app_metadata`), `secrets`, `stats.logins_count`, `client.client_id`, `connection`, `transaction.protocol`, `transaction.requested_scopes`, `resource_server.identifier`, `authorization.roles` (always empty) and `request` (`ip`, `hostname`, `method`, `user_agent` and `query`).
- `api.idToken.setCustomClaim` and `api.accessToken.setCustomClaim`. As in Auth0, the registered claims (`iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`) can't be overwritten.
- `api.user.setUserMetadata` and `api.user.setAppMetadata`. Setting a key to `null` removes it. Later actions see the change, and the user is updated once all actions have run.
- `api.access.deny`, which answers `/oauth/token` with a `403` `access_denied`.
- `api.cache`, kept for the life of the simulation.

Metadata is never added to the tokens unless an action sets it as a claim. An error thrown by an action ends the flow, as `api.access.deny` does, and `/oauth/token` responds with that error.

Unlike Auth0, actions run when `/oauth/token` issues the tokens rather than during `/authorize`. So in the authorization code flow, a denied login fails at the code exchange rather than redirecting with an error. `event.request.query` is still the original `/authorize` query, as in Auth0, so custom `ext-*` parameters reach the action, but the rest of `event.request` describes the `/oauth/token` request.

### Rules

Auth0 is retiring Rules on 18 November 2026, so prefer [Actions](#actions) for anything new.

It is possible to run [auth0 rules](https://auth0.com/docs/rules) if the compiled code files are on disk and all located in the same directory.

Set the `rulesDirectory` of the [options field](#options) to a path relative to your current working directory.

For example, a [sample rules directory](./test/rules) is in the auth0 package for testing.

If we want to run these rules files then we would add the `rulesDirectory` field to the [options object](#options).

## Endpoints

The following endpoints have been assigned handlers:

- `/authorize`
- `/login`
- `/u/login`
- `/usernamepassword/login`
- `/login/callback`
- `/oauth/token`
- `/v2/logout`
- `/.well-known/jwks.json`
- `/.well-known/openid-configuration`
- `/lo/reset` (password-change ticket page)

### Management API

A subset of the [Auth0 Management API](https://auth0.com/docs/api/management/v2) is served under `/api/v2`, backed by the same store the login flow reads, so a user created here can log in and a metadata update reaches the next login's [actions](#actions). Actions can call it too, at the simulator's own URL. Requests need a bearer token signed by the simulator from a `client_credentials` grant on `/oauth/token` with the audience `https://<simulator host>/api/v2/`. Scopes are not checked.

- `POST /api/v2/users` — `409` if the email is taken. The id is `auth0|<user_id>` (generated when omitted), `email_verified` defaults to `false`, and `password` is required, as it is for an Auth0 database connection.
- `GET /api/v2/users/:id`
- `PATCH /api/v2/users/:id` — `user_metadata` and `app_metadata` are merged at the top level, a `null` value removes the key, and an empty object clears it, as in Auth0.
- `DELETE /api/v2/users/:id`
- `GET /api/v2/users-by-email?email=`
- `POST /api/v2/tickets/password-change` — accepts `user_id` (or `email`), `result_url`, `ttl_sec` and `mark_email_as_verified`. The returned ticket URL opens a page on `/lo/reset` that sets the password and, if given, redirects to `result_url`.

Errors use Auth0's `{ statusCode, error, message, errorCode }` shape.
