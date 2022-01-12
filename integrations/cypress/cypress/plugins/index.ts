import { encrypt } from '../support/utils/encrypt';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(arg: any) {
  console.log(arg);
}

export default (on: Cypress.PluginEvents) => {
  on('task', { encrypt, log });
};
