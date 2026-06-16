---
"@simulacrum/server": patch:bug
---

`run-simulation-child.js` was not properly bundled. Add as entrypoint which adds it as a `bin` and includes it in bundling. The `bin` should be usuable, but will likely only be used directly within the lib.
