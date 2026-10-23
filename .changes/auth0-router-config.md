---
"@simulacrum/auth0-simulator": minor:enhance
---

Migrate to `@bomb.sh/router` which allows us to normalize our config, CLI args, and environment variable handling.

Possibly breaking: We now discover `auth0Simulator.config.json` or accept a path to a JSON config file through the `--config` / `-c` CLI option or `CONFIG` environment variable. We also adjusted the accepted configuration to `clientID` where `ID` is capitalized to align with Auth0 usage. The legacy `clientId` used in some situations now produces an error in configuration.
