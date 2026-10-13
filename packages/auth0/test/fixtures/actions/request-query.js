exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim("query", event.request.query);
};
