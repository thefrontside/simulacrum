exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim("connection", event.connection);
  api.idToken.setCustomClaim("provider", event.user.identities[0].provider);
};
