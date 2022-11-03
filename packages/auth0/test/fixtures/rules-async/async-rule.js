/*
fake async rule
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function asyncRule(user, context, callback) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let fetch = require('node-fetch');

  // these is a contrived rule, but entirely possible
  //  that someone would run a fetch and attach output
  //  to the user as part of the token
  let checkURL = 'https://www.frontside.com';
  user.checkURL = checkURL;
  let response = await fetch(checkURL);
  user.checkURLStatus = response.status;
  let result = await response.text();
  user.checkURLText = result.slice(0, 15);

  console.log(`added checkURL, ${user.checkURL}, to user, ${user.name}`);

  callback(null, user, context);
}
