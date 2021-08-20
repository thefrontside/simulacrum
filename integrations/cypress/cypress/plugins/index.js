/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
module.exports = (on, config) => {
  on('task', {
    log(message) {
      console.log(message);

      return null;
    },
  });
};
