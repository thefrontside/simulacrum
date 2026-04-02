---
"@simulacrum/foundation-simulator": patch:bug
---

Order initial log dispatching to help avoid the race condition made more prevalent by more direct sync vs async handling in effection v4.
