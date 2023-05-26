---
"@simulacrum/github-api-simulator": patch:bug
---

A `repository` query would fail due to a destructured `name`. This fixes the reference and adds an additional check for matching `nameWithOwner`.
