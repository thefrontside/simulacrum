import { defineConfig } from 'cypress';
import { encrypt } from "./cypress/support/utils/encrypt";

export default defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  defaultCommandTimeout: 10000,
  fixturesFolder: 'cypress/fixtures',
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  chromeWebSecurity: false,
  e2e: {
    setupNodeEvents(on) {
      on('task', { encrypt });
    },
    // This is the url on which the application in test is running
    baseUrl: 'http://localhost:3000',
  },
  env: {
    // This is the port of the @simulacrum/auth0-simulator
    AUTH0_SIMULATOR_PORT: 4000,
    // This is the port of the simulated Auth0 server
    AUTH0_RUNNING_PORT: 4400,
    AUTH0_SDK: 'auth0_react',
    AUTH0_CLIENT_SECRET: '6d0598f28f62a9aee14929ef46c7c8befdc015',
    AUTH0_AUDIENCE: 'https://thefrontside.auth0.com/api/v1/',
    AUTH0_CLIENTID:  "ZMmhsqbDLmti8otK",
    AUTH0_CONNECTION: "Username-Password-Authentication",
    AUTH0_SCOPE: "openid profile email offline_access",
    AUTH0_SESSION_COOKIE_NAME: "appSession",
    AUTH0_COOKIE_SECRET: "6d0598f28f62a9aee14929ef46c7c8befdc0150d870ec462fa45629511fd2a46",
  }
});
