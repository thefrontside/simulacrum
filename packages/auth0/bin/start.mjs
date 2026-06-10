#!/usr/bin/env node
import { simulation, defaultUser } from "../dist/index.mjs";

const app = simulation();
app.listen(4400, () =>
  console.log(
    `Auth0 simulation server started at https://localhost:4400\n` +
      `Visit the root route to view all available routes.\n\n` +
      `Point your configuration at this simulation server and use the default user below.\n` +
      `Email: ${defaultUser.email}\nPassword: ${defaultUser.password}\n` +
      `\nPress Ctrl+C to stop the server`,
  ),
);
