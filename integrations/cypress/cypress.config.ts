import { defineConfig } from 'cypress'

export default defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  defaultCommandTimeout: 10000,
  fixturesFolder: 'cypress/fixtures',
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  configFile: 'cypress/tsconfig.json',
  chromeWebSecurity: false,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.ts').default(on, config)
    },
    baseUrl: 'http://localhost:3000',
  },
  env: {
    PORT: 4000,
    "audience": "https://thefrontside.auth0.com/api/v1/",
    "domain": "localhost:4400",
    "clientID": "00000000000000000000000000000000",
    "connection": "Username-Password-Authentication",
    "scope": "openid profile email offline_access",
    "auth0SessionCookieName": "appSession",
    "auth0ClientSecret": "YOUR_AUTH0_CLIENT_SECRET",
    "auth0CookieSecret": "6d0598f28f62a9aee14929ef46c7c8befdc0150d870ec462fa45629511fd2a46"
  }
})
