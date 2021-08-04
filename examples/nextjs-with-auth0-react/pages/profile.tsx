import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

import Layout from "../components/layout";

export default function Profile(): JSX.Element {
  let { isLoading, isAuthenticated, error, user, loginWithRedirect, logout } =
    useAuth0();

  if (isLoading) {
    return <Layout>Loading...</Layout>;
  }
  if (error) {
    return <Layout>Oops... {error.message}</Layout>;
  }

  if (isAuthenticated) {
    // TODO the name is undefined, where could we get the name from?
    return (
      <Layout>
        <p>Hello {user?.name}</p>
        <p>Email: {user?.mail}</p>
        <img src={user?.picture} />
        <div>
          <button onClick={() => logout({ returnTo: window.location.origin })}>
            Log out
          </button>
        </div>
      </Layout>
    );
  } else {
    return (
      <Layout>
        <p>
          You are not currently logged in. To view your profile, login first.
        </p>
        <button onClick={loginWithRedirect}>Log in</button>
      </Layout>
    );
  }
}
