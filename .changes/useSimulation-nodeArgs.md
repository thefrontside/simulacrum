---
"@simulacrum/server": minor:enhance
---

Allow `useSimulation` to set extra `nodeArgs` for spawning a `child_process`. This enables using `--import` or other utilities such as might be required for directly executing TypeScript files on some verisons of node.
