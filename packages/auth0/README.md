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
    - [CLI Flags](#cli-flags)
    - [JSON Config Files](#json-config-files)
    - [Environment Variables](#environment-variables)
    - [Programmatic Options](#programmatic-options)
    - [Options](#options)
    - [Rules](#rules)
  - [Endpoints](#endpoints)

Please read the [main README](../../README.md) for more background on simulacrum.

The auth0 simulator has been initially written to mimic the responses of a real auth0 server that is
called from auth0 client libraries like
[auth0/react](https://auth0.com/docs/quickstart/spa/react/01-login) and
[auth0-spa-js](https://github.com/auth0/auth0-spa-js) that use the OpenID [authorization code
flow](https://developer.okta.com/docs/concepts/oauth-openid/).

If this does not meet your needs then please create a GitHub issue to start a conversation about
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
npx @simulacrum/auth0-simulator  # this will start a simulation server at https://localhost:4400
```

Given no further input, it will use the default values as below. This will point your app at the
simulation instead of the Auth0 endpoint.

```json
{
  "domain": "https://localhost:4400",
  "clientID": "00000000000000000000000000000000",
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

The Auth0 Simulator uses [@bomb.sh/router](https://github.com/bombshell-dev/router) to parse
configuration from CLI flags, environment variables, JSON config files, and programmatic options.
Configuration sources are resolved in this order: CLI flags, environment variables, JSON config,
then built-in defaults.

### CLI Flags

When running from the command line, you can pass configuration as flags:

```bash
npx @simulacrum/auth0-simulator --port 5000 --audience https://myapp.com/api
```

Run with `--help` to see all available flags:

```bash
npx @simulacrum/auth0-simulator --help
```

### JSON Config Files

You can stage configuration through a JSON file with `-c` and then override values with CLI flags:

```bash
npx @simulacrum/auth0-simulator -c auth0-simulator.json --port 5000
```

The simulator searches the current directory and its parents for
`auth0Simulator.config.json`. Use `-c` / `--config` or the `CONFIG` environment variable to load a
JSON config from any other path.

If you need a different configuration format, load it with your preferred parser and pass the
parsed values to the exported `getCLIConfig` helper. It validates the config and still handles the
simulator's CLI flags and environment variables. For example, after installing the `yaml` package:

```js
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { getCLIConfig, simulation } from "@simulacrum/auth0-simulator";

const result = getCLIConfig({
  args: process.argv.slice(2),
  envs: [{ name: "environment", value: process.env }],
  values: [
    {
      name: "auth0.yaml",
      value: parse(readFileSync("auth0.yaml", "utf8")),
    },
  ],
});

if (result.type !== "config") {
  console.error(result.text);
  if (result.type === "error") process.exitCode = 1;
} else {
  const app = simulation({ config: result.value });
  await app.listen();
}
```

The parsed config is the lowest-precedence source; environment variables and CLI flags can override
it. You can also use `simulation({ config })` directly when your own configuration system already
produces a final `Auth0Configuration` object.

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

The library takes `config` which can be used when another configuration system has already produced a final
`Auth0Configuration` object. This is useful if you want to parse config in another format. A supplied `config`
is used as-is and is not normalized again.

### Options

The `options` field supports the [auth0 configuration
fields](https://auth0.com/docs/quickstart/spa/vanillajs#configure-auth0). The option fields should
match the fields in the client application that is calling the auth0 server.

| Option           | CLI Flag            | Env Var           | Description                      |
| ---------------- | ------------------- | ----------------- | -------------------------------- |
| `port`           | `--port`, `-p`      | `PORT`            | Port to listen on                |
| `domain`         | `--domain`          | `DOMAIN`          | Server domain                    |
| `audience`       | `--audience`        | `AUDIENCE`        | Auth0 audience                   |
| `clientID`       | `--client-id`       | `CLIENT_ID`       | Auth0 client ID                  |
| `scope`          | `--scope`           | `SCOPE`           | Auth0 scope                      |
| `clientSecret`   | `--client-secret`   | `CLIENT_SECRET`   | Client secret                    |
| `rulesDirectory` | `--rules-directory` | `RULES_DIRECTORY` | Directory containing auth0 rules |
| `connection`     | `--connection`      | `CONNECTION`      | Auth0 connection                 |
| `protocol`       | `--protocol`        | `PROTOCOL`        | Server protocol (https/http)     |

The `scope` also accepts an array of objects containing `clientID`, `scope` and optionally
`audience` to enable dynamic scopes from a single simulator (programmatic usage only). This should
allow multiple clients to all use the same simulator. Additionally, setting the `clientID:
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
