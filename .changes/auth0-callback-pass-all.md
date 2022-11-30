---
'@simulacrum/auth0-simulator': patch
---

The auth0-simulator `/login/callback` is difficult to inspect. We need the `client_id` passed, but it seems safe to pass the whole `wctx` object as query strings.
