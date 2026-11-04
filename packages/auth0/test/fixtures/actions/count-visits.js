exports.onExecutePostLogin = async (event, api) => {
  let visits = (event.user.user_metadata.visits ?? 0) + 1;

  api.user.setUserMetadata("visits", visits);
  api.idToken.setCustomClaim("visits", visits);
};
