---
"@simulacrum/foundation-simulator": minor
---

Don't explicitly run simulation on "localhost" as the host parameter. This allows responses when addressed via `::1` (ipv6) and `0.0.0.0` in
ipv4 for example depending on system configuration. Allow the user to instead pass all properties that the Node `http` and `https` expect, including a port and host for cases where explicit control is required.
