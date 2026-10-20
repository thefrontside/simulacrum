---
"@simulacrum/auth0-simulator": minor:enhance
---

Migrate to `@bomb.sh/router` which allows us to normalize our config, CLI args, and environment variable handling.

Note this may be a breaking change depending how you passed configuration as we only support `./auth0Simulator.config.json` or passing a path to `.json` through `--config` arg or environment variable. We also adjusted the accepted configuration to `clientID` where `ID` is capitalized to align with Auth0 usage. Previously there were places which accepted or used `Id` which _should_ through an error now if configuration is passed with this capitalization. 
