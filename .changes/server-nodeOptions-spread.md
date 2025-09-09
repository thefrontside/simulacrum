---
"@simulacrum/server": patch:bug
---

Properly pass down `nodeOptions`. We were spreading the root options object which meant options like `cwd` were not being picked up.
