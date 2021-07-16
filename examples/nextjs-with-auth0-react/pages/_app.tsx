import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Auth0Provider, AppState } from "@auth0/auth0-react";
import Router from "next/router";

const onRedirectCallback = (appState: AppState) => {
  Router.replace(appState?.returnTo || "/");
};

export default function App({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL!}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!}
      audience={process.env.NEXT_PUBLIC_AUTH0_AUDIENCE}
      scope={process.env.NEXT_PUBLIC_AUTH0_SCOPE}
      redirectUri={
        (typeof window !== "undefined" && window.location.origin) ||
        process.env.NEXT_PUBLIC_AUTH0_BASE_URL
      }
      onRedirectCallback={onRedirectCallback}
    >
      <Component {...pageProps} />
    </Auth0Provider>
  );
}
