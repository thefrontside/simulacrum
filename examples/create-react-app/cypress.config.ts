import { defineConfig } from 'cypress'
import { encrypt } from '@simulacrum/auth0-cypress/encrypt';

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/integration/**/*.ts",
    setupNodeEvents(on, config) {
      on('task', { encrypt });
    },
    supportFile: "cypress/support/index.ts",
  },
  env: {
    NOTE_COMMENT: "NOTE: Also update 'integrations/cypress/.env.create-react-app' when changing these values",
    audience: "https://thefrontside.auth0.com/api/v1/",
    domain: "localhost:57630",
    AUTH0_CLIENT_ID: "00000000000000000000000000000000",
    connection: "Username-Password-Authentication",
    scope: "openid profile email offline_access",
    AUTH0_SDK: "auth0_react"
  },
  video: false,
  screenshotOnRunFailure: false,
  fixturesFolder: "cypress/fixtures",
  screenshotsFolder: "cypress/screenshots",
  videosFolder: "cypress/videos",
  chromeWebSecurity: false,
  defaultCommandTimeout: 10000
});