# Changelog

## \[0.2.3]

- Increment all of the `effection` and related `@effection` packages. There was an issue in `@effection/core` with `dist` assets and this ensures it won't exist in the user's lock file.
  - [30d575b](https://github.com/thefrontside/simulacrum/commit/30d575bc652a5329d67568b013f657691d1d86b6) upgrade past @effection/core dist issue on 2021-08-13
- Add bin script to auth0-simulator so it can be started via npx.
  - [88292f4](https://github.com/thefrontside/simulacrum/commit/88292f4f7f0f73ad8832943abcf342d7756fa2b5) add bin script to enable npx auth0-simulator via [#113](https://github.com/thefrontside/simulacrum/pull/113) on 2021-08-16

## \[0.2.2]

- Fix bug where person scenario was not passing parameters down
  - [cfe6862](https://github.com/thefrontside/simulacrum/commit/cfe68622e3609336e0cde6ea40c3d144710c3734) Transparently pass through person scenario on 2021-08-05
- fix malformed token that had `mail` field, not `email` field
  - [da75afd](https://github.com/thefrontside/simulacrum/commit/da75afdd0b5c47901e05ae7df5a4f968d0d2d613) add changefile on 2021-08-05
- Add a `debug` option to server that will log errors when
  createSimulation() fails
  - [7db8e11](https://github.com/thefrontside/simulacrum/commit/7db8e110f5d262f37d7dbf670d10a98cfe29f066) add changeset on 2021-07-15
  - [c2525dc](https://github.com/thefrontside/simulacrum/commit/c2525dcab303cc37a638c7cefe180ef9926ab9ee) remove redundant task.halt from logging effect on 2021-07-27
  - [6c2f83e](https://github.com/thefrontside/simulacrum/commit/6c2f83e5b183906a0a45ec6f3b8c8b06369dbfdb) add description to change file on 2021-07-30

## \[0.2.1]

- rollback effection to beta-5.
  - Bumped due to a bump in @simulacrum/client.
  - [793c074](https://github.com/thefrontside/simulacrum/commit/793c074c73d4958a9db5231b7ffdd54b5f103d4a) rollback effection to beta-5 on 2021-07-30

## \[0.2.0]

- Fix auth0-simulator dependencies in examples
  - [e2ba50a](https://github.com/thefrontside/simulacrum/commit/e2ba50ae8371dea129d5e981d91da93c07fd5e5c) Fix auth0-simulator dependencies in examples on 2021-07-30

## \[0.1.0]

- rename @simualcrum/auth0 to @simualcrum/auth0-simulator
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Add initial /authorize endpoint.
  - [c27dd61](https://github.com/thefrontside/simulacrum/commit/c27dd61c86eb675d66f4a770cb588e0711f0fc88) flesh out /authorize endpoint and add /login stub on 2021-06-29
  - [8caabd3](https://github.com/thefrontside/simulacrum/commit/8caabd3295580b6c94fb7f6347487db0654cf040) add /login view on 2021-06-29
  - [7c22f79](https://github.com/thefrontside/simulacrum/commit/7c22f799629e69859c04938f9dbedc7f775bf1a8) flow up until /oauth/token on 2021-06-29
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Fix public directory resolution in auth0.
  - [7ce0767](https://github.com/thefrontside/simulacrum/commit/7ce076758d3c25e07ee8a62715518b9c3d87dd5e) Fix public directory resolution in auth0 on 2021-07-22
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Implement login functionality.
  - [7c22f79](https://github.com/thefrontside/simulacrum/commit/7c22f799629e69859c04938f9dbedc7f775bf1a8) flow up until /oauth/token on 2021-06-29
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Add `/v2/logout` and remaining pieces
  - [0430761](https://github.com/thefrontside/simulacrum/commit/0430761982c8819b3eb4fe7335c2b2f0505b9a92) add logout route on 2021-07-14
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Add openid endpoints `/.well-known/jwks.json` and `/.well-known/openid-configuration`.
  - [1e15e42](https://github.com/thefrontside/simulacrum/commit/1e15e42c57bb4208d30f12afe14d000c47e400b9) Add openid endpoints  and . on 2021-07-09
  - [b36ca42](https://github.com/thefrontside/simulacrum/commit/b36ca42a0fd0c77c16a6139b0ac3a1303f40ebd9) fix ./well-known/openid-configuration typo on 2021-07-14
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Add the initial rules-runner code
  - [f60f31e](https://github.com/thefrontside/simulacrum/commit/f60f31e8ea65d08f45c472e5a945cc7f2c2dfd1e) add changeset on 2021-07-14
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Ensure the same auth0 state exists throughout and fix issuer forward slash issues.
  - [3487d1b](https://github.com/thefrontside/simulacrum/commit/3487d1bd056ca105dde3283a164f672724b5f92d) pass state to auth0-js and fix trailing for openid endpoints on 2021-07-27
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Add the /oauth/token endpoint that actually issues the jwt.
  - [258673e](https://github.com/thefrontside/simulacrum/commit/258673e6dd815f102c5893c1c13a49c3a1b2dfb4) add /oauth/token test on 2021-07-07
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
- Add a handler for `/authorize` for `response_mode` web_message
  - [43cbc9c](https://github.com/thefrontside/simulacrum/commit/43cbc9c513c8f27dddbade8733c5f61d7bc17348) add /authorize web_message handler on 2021-07-08
  - [089d67f](https://github.com/thefrontside/simulacrum/commit/089d67f270fa3f9706ed69099631a19fffc822c3) rename @simualcrum/auth0 to @simualcrum/auth0-simulator on 2021-07-27
