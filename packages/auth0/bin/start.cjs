#!/usr/bin/env node
const auth0APIsimulator = require("../dist/index.js");

const app = auth0APIsimulator.simulation();
app.listen(4400, () =>
  console.log(
    `Auth0 simulation server started at https://localhost:4400\n` +
      `Visit the root route to view all available routes.\n\n` +
      `Point your configuration at this simulation server and use the default user below.\n` +
      `Email: ${auth0APIsimulator.defaultUser.email}\nPassword: ${auth0APIsimulator.defaultUser.password}\n` +
      `\nPress Ctrl+C to stop the server`
  )
);
