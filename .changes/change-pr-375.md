---
"@simulacrum/auth0-simulator": patch
---

Include kid (`JWKS.keys[0].kid`) in `SignJWT().setProtectedHeader()` for `access_token` and `id_token` so clients performing JWKS-based signature verification can find the correct public key.
