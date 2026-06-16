---
"@simulacrum/auth0-simulator": patch:deps
"@simulacrum/github-api-simulator": patch:deps
---

Workspace deps with pnpm unintentionally expanded the dep range for `@simulacrum/foundation-simulator`. Clamp it down to only exact range defined.
