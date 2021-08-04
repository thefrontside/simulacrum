import React from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import Layout from "../components/layout";

const PrivateRoute = () => (
  <Layout>
    <div>
      <p>This route is private. You may only access it while logged in.</p>
    </div>
  </Layout>
);

export default withAuthenticationRequired(PrivateRoute, {
  // Show a message while the user waits to be redirected to the login page.
  onRedirecting: () => <div>Redirecting you to the login page...</div>,
});
