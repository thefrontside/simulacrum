/* eslint-disable @typescript-eslint/no-var-requires */

import { encrypt } from '@simulacrum/auth0-cypress/encrypt';

module.exports = (on: Cypress.PluginEvents) => {
  on('task', {encrypt});
};