---
"@simulacrum/foundation-simulator": minor
---

Don't explicitly run simulation on "localhost" as the host parameter.
This allows responses when addressedvia `::1` (ipv6) and `0.0.0.0` in
ipv4 for example.

