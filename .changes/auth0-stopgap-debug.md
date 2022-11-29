---
'@simulacrum/auth0-simulator': patch
---

The auth0-simulator uses a logger that was refactored and broke the middleware logging. As a stopgap to the required, involved refactor, log out based on the debug flag.
