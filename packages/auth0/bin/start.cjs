#!/usr/bin/env node
const { auth0Program, simulation, defaultUser } = require("../dist/index.cjs");

const args = process.argv.slice(2);

if (args[0] === "--help" || args[0] === "-h") {
  console.log(auth0Program.help());
  process.exit(0);
}

if (args[0] === "--version" || args[0] === "-v") {
  // @ts-ignore
  const pkg = require("../package.json");
  console.log(pkg.version);
  process.exit(0);
}

const app = simulation({ args });

app.listen().then(({ server, port }) => {
  const info = server.address();
  const host =
    typeof info === "object" && info?.address && !["::", "0.0.0.0"].includes(info.address)
      ? info.address
      : "localhost";
  console.log(
    `Auth0 simulation server started at https://${host}:${port}\n` +
      `Visit the root route to view all available routes.\n\n` +
      `Point your configuration at this simulation server and use the default user below.\n` +
      `Email: ${defaultUser.email}\nPassword: ${defaultUser.password}\n` +
      `\nPress Ctrl+C to stop the server`,
  );
});
