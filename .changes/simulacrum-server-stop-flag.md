---
"@simulacrum/server": patch:bug
---

Allow the /stop endpoint even if the service graph is not backgrounded. Allows one terminal to start but another to stop (or to use the idea of backgrounding through another function such as in tmux, etc.).
