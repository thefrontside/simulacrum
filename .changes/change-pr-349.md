---
"@simulacrum/auth0-simulator": patch
"@simulacrum/github-api-simulator": patch
"@simulacrum/foundation-simulator": patch
"@simulacrum/server": patch
---

Skip simulator asset minification. Also remove usage of `String.raw`. This was breaking the `/login` view in the Auth0 simulator with the way `tsdown` was escaping the strings.
