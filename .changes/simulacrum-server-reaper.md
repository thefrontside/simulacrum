---
"@simulacrum/server": minor:enhance
---

Add a new reaper process. We hand it the pids of processes when they start and when they shutdown. If the main service graph gets hard killed and the reaper see it lost the parent, the reaper will kill all (now) zombied processes and shut itself down. This is primarily in place to prevent bad shutdown sequences leaving zombie processes.
