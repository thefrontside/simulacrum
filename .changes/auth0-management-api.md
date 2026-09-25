---
"@simulacrum/auth0-simulator": minor
---

Add a store-backed subset of the Management API (`/api/v2/users`, `/api/v2/users-by-email`, `/api/v2/tickets/password-change`) plus a `/lo/reset` page to redeem password-change tickets. Users now carry `email_verified` (default `true` for seeded users), which the tokens and `/userinfo` report.
