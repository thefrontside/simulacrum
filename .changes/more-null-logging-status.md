---
'@simulacrum/server': patch
---

The simulation server can return null events on shutdown, and the logger did not consider this. The previous patch fixed a single instance. This addresses the remaining three instances by checking for undefined within the filter.
