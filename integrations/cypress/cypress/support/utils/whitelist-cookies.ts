import { getConfig } from './config';

Cypress.Cookies.defaults({
  preserve: [
    getConfig().sessionCookieName,
  ],
});
