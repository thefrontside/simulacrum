---
'@simulacrum/auth0-simulator': patch
---

The login form needs `event.preventDefault()` to allow the Auth0 library functions to run instead of default form functionality.
