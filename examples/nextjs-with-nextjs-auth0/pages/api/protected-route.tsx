import { withApiAuthRequired, getSession } from "@auth0/nextjs-auth0";

export default withApiAuthRequired(function ProtectedRoute(req, res) {
  let session = getSession(req, res);
  res.status(200).json(session);
});
