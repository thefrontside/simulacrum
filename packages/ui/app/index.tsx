import React from "react";
import { render } from "react-dom";

import { App } from './app';

render(<App server={getServerURL}/>, document.getElementById("root"));

function getServerURL(): URL {
  let location = new URL(document.location.href);
  let server = location.searchParams.get('server');
  if (!server) {
    let self = new URL('http://localhost');
    self.protocol = location.protocol;
    self.host = location.host;
    return self;
  } else {
    return new URL(server);
  }
}
