---
'@simulacrum/auth0-simulator': patch
---

Async rules were not properly processing and would run as a race condition mutating the `user` and `context` objects. This would mean part of the rule might be applied. This adds some additional wrappers in the rule running to properly handle and `await` on async code.
