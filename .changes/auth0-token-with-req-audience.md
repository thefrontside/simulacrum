---
'@simulacrum/auth0-simulator': patch
---

The simulator should consider the audience and client_id passed in the request. The values may be important for logic in user defined rules, and is used in validating the token, e.g. in `auth0-react`.
