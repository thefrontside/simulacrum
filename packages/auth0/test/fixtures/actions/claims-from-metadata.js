exports.onExecutePostLogin = async (event, api) => {
  let namespace = event.secrets.NAMESPACE;

  // let overlapping logins overlap
  await new Promise((resolve) => setTimeout(resolve, 20));
  api.accessToken.setCustomClaim(`${namespace}/api`, event.resource_server.identifier);
  api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  api.accessToken.setCustomClaim(`${namespace}/hostname`, event.request.hostname);

  api.idToken.setCustomClaim(
    `${namespace}/organisation_id`,
    event.user.user_metadata.organisation_id,
  );
  api.accessToken.setCustomClaim(
    `${namespace}/organisation_id`,
    event.user.user_metadata.organisation_id,
  );
  api.idToken.setCustomClaim(`${namespace}/logins`, event.stats.logins_count);
  api.idToken.setCustomClaim(`${namespace}/protocol`, event.transaction.protocol);
};
