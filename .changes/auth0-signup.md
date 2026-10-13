---
"@simulacrum/auth0-simulator": minor
---

Add signup: `/authorize` forwards `screen_hint` and `login_hint` to `/login`, which renders a signup form for `screen_hint=signup` and prefills the email from `login_hint`. The form posts to a new `/dbconnections/signup` endpoint that adds the user to the store, then logs them in. Set `disableSignup: true` to turn it off.
