# Auth0 simulator

Read about this simulator on our blog: [Simplified Local Development and Testing with Auth0
Simulation](https://frontside.com/blog/2022-01-13-auth0-simulator/).

## Table of Contents

- [Auth0 simulator](#auth0-simulator)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [Using Default User](#using-default-user)
    - [Code](#code)
    - [Example](#example)
  - [Configuration](#configuration)
    - [Options](#options)
    - [Rules](#rules)
  - [Endpoints](#endpoints)

Please read the [main README](../../README.md) for more background on simulacrum.

The auth0 simulator has been initially written to mimic the responses of a real auth0 server that is
called from auth0 client libraries like
[auth0/react](https://auth0.com/docs/quickstart/spa/react/01-login) and
[auth0-spa-js](https://github.com/auth0/auth0-spa-js) that use the OpenID [authorization code
flow](https://developer.okta.com/docs/concepts/oauth-openid/).

If this does not meet your needs then please create a github issue to start a conversation about
adding new OpenID flows.

## Quick Start

This quick start assumes you have your own app with Auth0.

> [!IMPORTANT]
> The Auth0 clients expect the server to be served as `https`, and will throw an error if it is
> served as `http`. Currently, we rely on a certificate available in the home directory. On first
> run, you will see instructions on how to set up this certificate through `mkcert`.

### Using Default User

You may start a server directly from the command line.

```bash
npx @simulacrum/auth0-simulator  # this will start a simulation server at http://localhost:4400
```

Given no further input, it will use the default values as below. This will point your app at the
simulation instead of the Auth0 endpoint.

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

### Example

The folks at Auth0 maintain many samples such as
[github.com/auth0-samples/auth0-react-samples](https://github.com/auth0-samples/auth0-react-samples).
Follow the instructions to run the sample, set the configuration in `auth_config.json` to match the
defaults as noted above, and run the Auth0 simulation server with `npx auth0-simulator`.

## Configuration

The Auth0 Simulator uses [configliere](https://github.com/thefrontside/configliere) to parse
configuration from CLI flags, environment variables, and programmatic options.

### CLI Flags

When running from the command line, you can pass configuration as flags:

```bash
npx @simulacrum/auth0-simulator --port 5000 --audience https://myapp.com/api
```

Run with `--help` to see all available flags:

```bash
npx @simulacrum/auth0-simulator --help
```

### Environment Variables

Configuration can also be set via environment variables. Field names are mapped to
`UPPER_SNAKE_CASE`:

```bash
PORT=5000 AUDIENCE=https://myapp.com/api npx @simulacrum/auth0-simulator
```

### Programmatic Options

When using the simulator as a library, pass options directly:

```js
import { simulation } from "@simulacrum/auth0-simulator";

const app = simulation({
  options: {
    port: 5000,
    audience: "https://myapp.com/api",
  },
});
```

### Options

The `options` field supports the [auth0 configuration
fields](https://auth0.com/docs/quickstart/spa/vanillajs#configure-auth0). The option fields should
match the fields in the client application that is calling the auth0 server.

| Option           | CLI Flag            | Env Var           | Description                      |
| ---------------- | ------------------- | ----------------- | -------------------------------- |
| `port`           | `--port`, `-p`      | `PORT`            | Port to listen on                |
| `domain`         | `--domain`          | `DOMAIN`          | Server domain                    |
| `audience`       | `--audience`        | `AUDIENCE`        | Auth0 audience                   |
| `clientId`       | `--client-id`       | `CLIENT_ID`       | Auth0 client ID                  |
| `scope`          | `--scope`           | `SCOPE`           | Auth0 scope                      |
| `clientSecret`   | `--client-secret`   | `CLIENT_SECRET`   | Client secret                    |
| `rulesDirectory` | `--rules-directory` | `RULES_DIRECTORY` | Directory containing auth0 rules |
| `connection`     | `--connection`      | `CONNECTION`      | Auth0 connection                 |
| `protocol`       | `--protocol`        | `PROTOCOL`        | Server protocol (https/http)     |

The `scope` also accepts an array of objects containing `clientId`, `scope` and optionally
`audience` to enable dynamic scopes from a single simulator (programmatic usage only). This should
allow multiple clients to all use the same simulator. Additionally, setting the `clientId:
"default"` will enable a default fallback scope so every client does not need to be included.

An optional [`rulesDirectory` field](#rules) can specify a directory of [auth0
rules](https://auth0.com/docs/rules) code files, more on this [below](#rules).

### Rules

It is possible to run [auth0 rules](https://auth0.com/docs/rules) if the compiled code files are on
disk and all located in the same directory.

Set the `rulesDirectory` of the [options field](#options) to a path relative to your current working
directory.

For example, a [sample rules directory](./test/rules) is in the auth0 package for testing.

If we want to run these rules files then we would add the `rulesDirectory` field to the [options
object](#options).

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
