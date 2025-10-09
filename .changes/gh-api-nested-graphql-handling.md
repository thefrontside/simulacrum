---
"@simulacrum/github-api-simulator": patch:bug
---

Better handle nested owners which previously threw errors, e.g. map() of undefined. Also accept the custom header as used by the `@octokit/graphql` package.
