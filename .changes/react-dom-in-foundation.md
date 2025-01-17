---
"@simulacrum/foundation-simulator": patch:bug
---

Due to upstream dep requirements, the `react-redux` depends on `react-dom`. Including it as a dependency to resolve this issue, but we will work to remove it from the dependency chain as that code path is not utilized in this library.
