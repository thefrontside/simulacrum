---
"@simulacrum/auth0-simulator": minor
---

Run Auth0 post-login Actions through the new `actions` option. Users can carry `user_metadata`, `app_metadata` and `logins_count` (seeded via `initialState`), which actions read from `event.user` and update with `api.user.setUserMetadata` and `api.user.setAppMetadata`.
