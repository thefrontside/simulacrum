/*
 simple fake rule to add an avatar
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function avatar(user, context, callback) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  user.picture = 'http://localhost:3000/fake-avatar.png'

  console.log(`added avatar ${user.picture} to user`);

  callback(null, user, context);
}
