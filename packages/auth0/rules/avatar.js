/*
 simple fake rule to add an avatar
*/
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function avatar(user, context, callback) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  user.picture = require('faker').internet.avatar();

  callback(null, user, context);
}
