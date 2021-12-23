import "../styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "@auth0/nextjs-auth0";

export default function App({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <UserProvider>
      <Component {...pageProps} />
    </UserProvider>
  );
}
