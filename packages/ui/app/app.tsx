import 'graphiql/graphiql.css';
import { GraphiQL } from 'graphiql';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import type { ReactElement } from 'react';
import React from 'react';

export interface AppProps {
  server: () => URL;
}

export function App({ server }: AppProps): ReactElement {
  let url = server();

  let websocketEndpoint = new URL(url);
  websocketEndpoint.protocol = "ws";

  return <GraphiQL fetcher={createGraphiQLFetcher({
    url: `${url}`,
    subscriptionUrl: `${websocketEndpoint}`
  })}/>;
}
