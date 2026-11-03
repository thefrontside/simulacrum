exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim("had_organisation", "organisation_id" in event.user.user_metadata);
  api.user.setUserMetadata("organisation_id", null);
};
