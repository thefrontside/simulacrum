#!/usr/bin/env node
import { simulation, defaultUser, getConfig } from "../dist/index.mjs";

const config = getConfig();
const port = config.port ?? 4400;
const authority = `https://localhost:${port}/${config.tenant}`;

const app = simulation();
app.listen(port, () =>
  console.log(
    `Entra ID simulation server started at https://localhost:${port}\n\n` +
      `Point your application's authority at:\n  ${authority}\n\n` +
      `Discovery document:\n  ${authority}/v2.0/.well-known/openid-configuration\n\n` +
      `Sign in with the default user:\n` +
      `  Email:    ${defaultUser.email}\n` +
      `  Password: ${defaultUser.password}\n\n` +
      `Press Ctrl+C to stop the server`,
  ),
);
