import React from "react";
import { useUser } from "@auth0/nextjs-auth0";

import Layout from "../components/layout";

export default function Profile(): JSX.Element {
  let { user, error, isLoading } = useUser();

  if (isLoading) {
    return <Layout>Loading...</Layout>;
  }
  if (error) {
    return <Layout>Oops... {error.message}</Layout>;
  }

  if (user) {
    // TODO the name is undefined, where could we get the name from?
    return (
      <Layout>
        <p>Hello {user?.name}</p>
        <p>Email: {user?.mail}</p>
        <img src={user?.picture} />
        <div>
          <a href="/api/auth/logout" data-testid="logout">
            Logout
          </a>
        </div>
      </Layout>
    );
  } else {
    return (
      <Layout>
        <p>
          You are not currently logged in. To view your profile, login first.
        </p>
        <a href="/api/auth/login" data-testid="logout">
          Login
        </a>
      </Layout>
    );
  }
}
