---
"@simulacrum/entra-simulator": minor
---

Add a Microsoft Entra ID (Azure AD) OIDC simulator. It is a drop-in replacement
for the core Entra authentication user flows — point an application's authority
at the simulator and the OpenID discovery document, JWKS, AAD instance
discovery, authorization-code + PKCE flow, refresh-token, client-credentials and
ROPC grants, userinfo and logout endpoints all respond with Entra v2.0 shaped
tokens and metadata, with no application source changes required.
