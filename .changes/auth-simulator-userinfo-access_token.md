---
'@simulacrum/auth0-simulator': 'patch'
---

The auth0 simulator `/userinfo` endpoint will fall back to check for the `access_token` query parameter if the authorization header is not set.
