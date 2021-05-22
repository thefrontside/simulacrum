import "graphiql/graphiql.css";
import { GraphiQL } from "graphiql";
import { createGraphiQLFetcher } from "@graphiql/toolkit";

export interface AppProps {
  server: () => URL;
}

export function App({ server }: AppProps): JSX.Element {
  let url = server();

  let websocketEndpoint = new URL(`${url}`);
  websocketEndpoint.protocol = "ws";

  return (
    <GraphiQL
      fetcher={createGraphiQLFetcher({
        url: `${url}`,
        subscriptionUrl: `${websocketEndpoint}`,
      })}
    />
  );
}
