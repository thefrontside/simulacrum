// eslint-disable-next-line @typescript-eslint/no-unused-vars
function metadataClaims(user, context, callback) {
  let namespace = "https://example.nl";

  context.accessToken[`${namespace}/org`] = user.app_metadata.organisation_id;
  context.idToken[`${namespace}/theme`] = user.user_metadata.theme;

  callback(null, user, context);
}
