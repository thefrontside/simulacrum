# Microsoft Entra ID (Azure AD) simulator

A [Simulacrum](../../README.md) simulator that stands in for **Microsoft Entra ID**
(formerly Azure Active Directory) OpenID Connect. Point an application that
authenticates with Entra at this server and run the core sign-in flows locally —
no mock data, no changes to your application's authentication source code.

It is the Entra counterpart to the [`@simulacrum/auth0-simulator`](../auth0) and
is built on top of the [`@simulacrum/foundation-simulator`](../foundation).

## Table of Contents

- [Quick Start](#quick-start)
- [Pointing your application at the simulator](#pointing-your-application-at-the-simulator)
  - [MSAL (msal-node / msal-browser / msal-react)](#msal-msal-node--msal-browser--msal-react)
  - [passport-azure-ad / NestJS](#passport-azure-ad--nestjs)
  - [next-auth Azure AD / Microsoft Entra ID provider](#next-auth-azure-ad--microsoft-entra-id-provider)
- [Configuration](#configuration)
- [Users](#users)
- [Supported flows & endpoints](#supported-flows--endpoints)
- [What is (and isn't) simulated](#what-is-and-isnt-simulated)

> [!IMPORTANT]
> Entra client libraries require the identity provider to be served over `https`.
> This simulator serves `https` using a locally-trusted certificate. On first run
> you will be shown instructions to create one with
> [`mkcert`](https://github.com/FiloSottile/mkcert).

## Quick Start

Start a server directly from the command line:

```bash
npx @simulacrum/entra-simulator   # starts an https server on https://localhost:4400
```

It prints the authority and discovery URL to point your application at, along
with the default user's credentials.

Or run it from code:

```js
import { simulation } from "@simulacrum/entra-simulator";

const app = simulation();
app.listen(4400, () =>
  console.log("Entra simulation server started at https://localhost:4400"),
);
```

Seed your own users with `initialState`:

```js
const app = simulation({
  initialState: {
    users: [
      { id: "11111111-1111-1111-1111-111111111111", name: "Ada Lovelace", email: "ada@example.com", password: "hunter2" },
    ],
  },
  options: {
    tenant: "0e8a3b8a-0000-4000-a000-0000000000ab",
    clientId: "<your-app-registration-client-id>",
  },
});
```

## Pointing your application at the simulator

The only application change required is **where the identity provider lives** —
the authority/issuer URL. Every core authentication flow then behaves as it would
against real Entra.

The authority the simulator serves is:

```
https://localhost:4400/<tenant>
```

and the discovery document (which drives every other endpoint) is at:

```
https://localhost:4400/<tenant>/v2.0/.well-known/openid-configuration
```

Because a non-`login.microsoftonline.com` host is being used, disable AAD
instance validation (or rely on the simulator's built-in instance-discovery
endpoint) as shown below. Set `NODE_EXTRA_CA_CERTS` to the mkcert root CA so your
runtime trusts the simulator's certificate.

### MSAL (msal-node / msal-browser / msal-react)

```js
const config = {
  auth: {
    clientId: "<your-client-id>",
    authority: "https://localhost:4400/0e8a3b8a-0000-4000-a000-0000000000ab",
    knownAuthorities: ["localhost:4400"],
    // treat this as a generic OIDC authority rather than a public AAD cloud
    protocolMode: "OIDC",
  },
};
```

- `authority` points at the simulator instead of `https://login.microsoftonline.com/<tenant>`.
- `knownAuthorities` / `protocolMode: "OIDC"` let MSAL accept the custom host.
  (The simulator also implements the AAD `/common/discovery/instance` endpoint,
  so default instance discovery succeeds too.)

### passport-azure-ad / NestJS

```js
new OIDCStrategy({
  identityMetadata:
    "https://localhost:4400/0e8a3b8a-0000-4000-a000-0000000000ab/v2.0/.well-known/openid-configuration",
  clientID: "<your-client-id>",
  responseType: "code",
  responseMode: "query",
  redirectUrl: "http://localhost:3000/auth/callback",
  scope: ["openid", "profile", "email", "offline_access"],
  validateIssuer: true,
});
```

`issuer` in the tokens matches the discovery document's `issuer`, so
`validateIssuer` can stay on.

### next-auth Azure AD / Microsoft Entra ID provider

```js
AzureADProvider({
  clientId: process.env.AZURE_AD_CLIENT_ID,
  clientSecret: "unused-by-the-simulator",
  issuer: "https://localhost:4400/0e8a3b8a-0000-4000-a000-0000000000ab/v2.0",
  wellKnown:
    "https://localhost:4400/0e8a3b8a-0000-4000-a000-0000000000ab/v2.0/.well-known/openid-configuration",
});
```

## Configuration

Configuration is loaded with [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
under the module name `entraSimulator` (e.g. a `.entraSimulatorrc.json` file), and
can be overridden with the `options` argument to `simulation()`.

| Option     | Default                                    | Description                                                                                   |
| ---------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `port`     | `4400`                                     | Port the https server listens on.                                                             |
| `tenant`   | `0e8a3b8a-0000-4000-a000-0000000000ab`     | Default tenant used for the bin/example authority. Any tenant used in the path is honored and becomes the token `tid`/issuer tenant. |
| `clientId` | `00000000-0000-0000-0000-000000000000`     | Default application (client) id used when a request does not supply one.                       |
| `audience` | `00000000-0000-0000-0000-000000000000`     | Default access-token audience for `client_credentials` when no `resource` is passed.           |
| `scope`    | `openid profile email offline_access`      | Default scope echoed when a request does not supply one.                                        |

The `tenant` segment in the authority path is authoritative: whatever tenant an
application uses becomes the `tid` claim and the issuer tenant, keeping the
discovery `issuer` and issued tokens internally consistent.

## Users

With no `initialState` the store is seeded with a single default user:

```
Email:    default@example.com
Password: 12345
```

Each user has an `id` (used as the `oid` and `sub` claims), `name`, `email`,
optional `password` (default `12345`) and optional `preferredUsername`
(defaults to the email).

## Supported flows & endpoints

Core Entra v2.0 authentication flows, all returning v2.0-shaped tokens signed
with a key published at the JWKS endpoint:

- **Authorization code flow with PKCE** (`response_type=code`, `S256`/`plain`)
- **Refresh token** grant
- **Client credentials** grant (app-only token with `roles`)
- **Resource Owner Password Credentials (ROPC)** grant — handy for headless tests
- `response_mode` of `query`, `fragment`, and `form_post`
- Silent authentication (`prompt=none`) via the session cookie

Endpoints (tenant-scoped, mirroring real Entra):

- `GET  /:tenant/v2.0/.well-known/openid-configuration`
- `GET  /:tenant/discovery/v2.0/keys` (JWKS)
- `GET  /:tenant/discovery/instance` (AAD instance discovery, incl. `/common/...`)
- `GET  /:tenant/oauth2/v2.0/authorize`
- `POST /:tenant/login` (login form submission)
- `POST /:tenant/oauth2/v2.0/token`
- `GET  /:tenant/oauth2/v2.0/logout`
- `GET  /oidc/userinfo` (Microsoft Graph style)

## What is (and isn't) simulated

The goal is a faithful stand-in for **core authentication user flows**, not the
entire Entra/Graph surface. ID and access tokens carry the standard v2.0 claims
(`ver`, `iss`, `sub`, `aud`, `oid`, `tid`, `preferred_username`, `email`,
`nonce`, `scp`/`roles`, `azp`, …) and validate against the JWKS with correct
issuer and audience. Not simulated: conditional access, MFA, consent screens,
app-role/group assignment logic, and the Microsoft Graph data API beyond the
OIDC `userinfo` endpoint. If you need one of these, open an issue to discuss
extending the simulator.
