import { encrypt } from '../../src/utils/encrypt';

export default (on: Cypress.PluginEvents) => {
    on('task', { encrypt });
};
