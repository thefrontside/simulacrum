/*
a rule that takes a while, so that overlapping logins overlap while it runs
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function slowRule(user, context, callback) {
  setTimeout(() => callback(null, user, context), 30);
}
