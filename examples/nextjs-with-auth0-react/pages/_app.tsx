import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Auth0Provider, AppState } from "@auth0/auth0-react";
import Router from "next/router";
import { assert } from 'assert-ts';

const onRedirectCallback = (appState: AppState) => {
  Router.replace(appState?.returnTo || "/");
};


export default function App({ Component, pageProps }: AppProps): JSX.Element {
  assert(!!process.env.NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL, `You must set the NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL environment variable`);
  assert(!!process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID, `You must set the NEXT_PUBLIC_AUTH0_CLIENT_ID environment variable`);

  return (
    <Auth0Provider
      domain={process.env.NEXT_PUBLIC_AUTH0_ISSUER_BASE_URL}
      clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
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
