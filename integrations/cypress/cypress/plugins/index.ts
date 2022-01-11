import { encrypt } from '../support/utils/encrypt';

export default (on: Cypress.PluginEvents) => {
  on('task', { encrypt });
};
