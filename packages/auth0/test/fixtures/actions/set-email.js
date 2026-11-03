exports.onExecutePostLogin = async (event, api) => {
  api.accessToken.setCustomClaim("email", "work@example.com");
};
