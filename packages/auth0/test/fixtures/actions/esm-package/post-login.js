// CommonJS, as deployed to Auth0, although this package is "type": "module"
const { createHash } = require("node:crypto");

exports.onExecutePostLogin = async (event, api) => {
  api.idToken.setCustomClaim(
    "user_hash",
    createHash("sha256").update(event.user.user_id).digest("hex"),
  );
};
