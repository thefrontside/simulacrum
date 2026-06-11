---
"@simulacrum/auth0-simulator": minor:enhance
---

Swap from `jsonwebtoken` to `jose` which provides better compatibility with ESM. This _should_ be a non-breaking change. If tokens are generated differently, we would consider it a bug.
