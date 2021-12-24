import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

import Layout from "../components/layout";

export default function Home(): JSX.Element {
  let { isLoading, isAuthenticated, error, user, loginWithRedirect, logout } =
    useAuth0();

  if (isLoading) {
    return <Layout>Loading...</Layout>;
  }
  if (error) {
    return <Layout>Oops... {error.message}</Layout>;
  }

  if (isAuthenticated) {
    return (
      <Layout>
        Hello {user?.name}{" "}
        <button onClick={() => logout({ returnTo: window.location.origin })}>
          Logout
        </button>
      </Layout>
    );
  } else {
    return (
      <Layout>
        <p>
          To test the login click in <i>Login</i>
        </p>
        <p>
          Once you have logged in you should be able to click in{" "}
          <i>the Profile Page</i> and <i>Logout</i>
        </p>
        <button onClick={loginWithRedirect}>Log in</button>
      </Layout>
    );
  }
}
