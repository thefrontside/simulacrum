---
'@simulacrum/server': patch
---

The simulation server can return null events on shutdown, and the logger did not consider this. Check for undefined within the filter.
