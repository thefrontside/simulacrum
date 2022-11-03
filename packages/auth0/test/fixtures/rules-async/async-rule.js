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
  let checkURLOne = 'https://www.frontside.com';
  user.checkURLOne = checkURLOne;
  let responseOne = await fetch(checkURLOne);
  user.checkURLOneStatus = responseOne.status;
  let resultOne = await responseOne.text();
  user.checkURLOneText = resultOne.slice(0, 15);

  // this is a sub-site with various redirects to it should
  //   take some time to revolve
  let checkURLTwo = 'https://www.frontside.com/effection';
  user.checkURLTwo = checkURLTwo;
  let responseTwo = await fetch(checkURLTwo);
  user.checkURLTwoStatus = responseTwo.status;
  let resultTwo = await responseTwo.text();
  user.checkURLTwoText = resultTwo.slice(0, 15);

  console.log(`added checkURL, ${user.checkURL}, to user, ${user.name}`);

  callback(null, user, context);
}
