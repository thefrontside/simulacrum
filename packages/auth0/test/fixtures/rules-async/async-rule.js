/*
fake async rule
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function asyncRule(user, context, callback) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let fetch = require('node-fetch');

  let checkURL = 'https://www.frontside.com';
  user.checkURL = checkURL;
  let response = await fetch(checkURL);
  user.checkURLStatus = response.status;
  // console.dir({ response });
  // let result = await response.json();
  // console.dir({ result });

  console.log(`added checkURL, ${user.checkURL}, to user, ${user.name}`);

  callback(null, user, context);
}
