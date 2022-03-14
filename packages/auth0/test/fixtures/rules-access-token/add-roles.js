// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addRolesAndEmail(user, context, callback) {
  let namespace = 'https://example.nl';
  let assignedRoles = ["example"];

  let idTokenClaims = context.idToken || {};
  let accessTokenClaims = context.accessToken || {};

  idTokenClaims[`${namespace}/roles`] = assignedRoles;

  accessTokenClaims[`${namespace}/roles`] = assignedRoles;
  accessTokenClaims[`${namespace}/email`] = idTokenClaims.email;

  context.idToken = idTokenClaims;
  context.accessToken = accessTokenClaims;

  callback(null, user, context);
}
