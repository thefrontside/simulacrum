/*
 simple fake rule to add a trustProfile
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function friendOrFoe(user, context, callback) {
  user.trustProfile = 'foe';
  if (user.name === 'Fred Waters') {
    user.trustProfile = 'friend';
  }

  console.log(
    `added trustProfile, ${user.trustProfile}, to user, ${user.name}`
  );

  callback(null, user, context);
}
