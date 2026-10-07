---
"@simulacrum/server": minor:enhance
---

Add `launchGraph` option in `simulationCLI` to allow a user to "wrap" the service graph process. For example, a team using only linux could opt to wrap the graph in `unshare` for more direct kernel protections from zombie processes.
