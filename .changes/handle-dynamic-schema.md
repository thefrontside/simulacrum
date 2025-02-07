---
"@simulacrum/github-api-simulator": patch:bug
---

_Possibly breaking_ We incorrectly used the hosted schema with an Enterprise endpoint. Correcting this to default to the hosted endpoint with the hosted schema. Use `apiUrl` and `apiSchema` if there is need to adjust for Enterprise use cases.
