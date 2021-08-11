import React, { ReactElement } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'graphiql/graphiql.css';
import { GraphiQL } from 'graphiql';
import { createGraphiQLFetcher } from '@graphiql/toolkit';
import { GraphPage } from './graph';
import { Effection, run } from 'effection';
import { EffectionContext } from '@effection/react';
import { createClient } from '@simulacrum/client';

export interface AppProps {
  server: () => URL;
}

export function App({ server }: AppProps): ReactElement {
  let url = server();

  let websocketEndpoint = new URL(url);
  websocketEndpoint.protocol = 'ws';

  let client = createClient(url);
  let task = run(client.state());

  return (
    <EffectionContext.Provider value={task}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <GraphiQL
                fetcher={createGraphiQLFetcher({
                  url: `${url}`,
                  subscriptionUrl: `${websocketEndpoint}`,
                })}
              />
            }
          />
          <Route path="/graph" element={<GraphPage />} />
        </Routes>
      </BrowserRouter>
    </EffectionContext.Provider>
  );
}
