---
'@simulacrum/auth0-simulator': patch
---

Added specific support for the `grant_type` `client_credentials` which is required for machine-to-machine tokens. This grant_type specifically does not run the rules. The `scope` option now accepts an array of objects to specify specific scopes for specific clients.
