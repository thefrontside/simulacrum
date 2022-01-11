import { encrypt } from '../support/utils/encrypt';

module.exports = (on) => {
  on('task', { encrypt });
};
