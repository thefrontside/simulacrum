// eslint-disable-next-line @typescript-eslint/no-var-requires
const { encrypt } = require('../../encrypt');

module.exports = (on) => {
  on('task', { encrypt });
};
