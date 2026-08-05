/*
fake async rule
*/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function asyncRule(user, context, callback) {
  let fetcher = async (url) => {
    let response = await fetch(url);
    let checkURLStatus = response.status;
    let result = await response.text();
    let titleStart = result.indexOf("<title>");
    let titleEnd = result.indexOf("</title>");
    let checkURLText = result.slice(titleStart + "<title>".length, titleEnd);
    return { checkURLStatus, checkURLText };
  };

  // these is a contrived rule, but entirely possible
  //  that someone would run a fetch and attach output
  //  to the user as part of the token
  let checkURLOne = `${__simulator.context.idToken.iss}frontside`;
  user.checkURLOne = checkURLOne;
  let checkOne = await fetcher(checkURLOne);
  user.checkURLOneStatus = checkOne.checkURLStatus;
  user.checkURLOneText = checkOne.checkURLText.toLowerCase();

  // this is a sub-site with various redirects to it should
  //   take some time to revolve
  let checkURLTwo = `${__simulator.context.idToken.iss}effection`;
  user.checkURLTwo = checkURLTwo;
  let checkTwo = await fetcher(checkURLTwo);
  user.checkURLTwoStatus = checkTwo.checkURLStatus;
  user.checkURLTwoText = checkTwo.checkURLText.toLowerCase();

  console.log(`added checkURL, ${user.checkURLOne} and ${user.checkURLTwo}, to user, ${user.name}`);
  callback(null, user, context);
}
