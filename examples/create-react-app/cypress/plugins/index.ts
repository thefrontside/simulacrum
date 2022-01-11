/* eslint-disable @typescript-eslint/no-var-requires */

const { encrypt } = require('@simulacrum/auth0-cypress/encrypt');

module.exports = (on: Cypress.PluginEvents) => {
  on('encrypt', encrypt);
};