exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim("event_email_verified", event.user.email_verified);
};
