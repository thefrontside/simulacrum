const { logger } = require('@simulacrum/logger');

/*
 simple fake rule to add an avatar
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function avatar(user, context, callback) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  user.picture = require('faker').internet.avatar();

  logger.info(`added avatar ${user.picture} to user`);

  callback(null, user, context);
}
