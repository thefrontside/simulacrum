const { greeting } = require("./sibling.cjs");

exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim("greeting", greeting);
};
