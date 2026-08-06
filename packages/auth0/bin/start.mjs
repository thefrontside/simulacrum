#!/usr/bin/env node
import {
  getCLIConfig,
  simulation,
  defaultUser,
} from "@simulacrum/auth0-simulator";

const args = process.argv.slice(2);
const envs = [{ name: "env", value: /** @type {Record<string, string>} */ (process.env) }];

async function main() {
  const result = getCLIConfig({ args, envs });

  if (result.type === "help" || result.type === "version") {
    console.log(result.text);
    return;
  }

  const app = simulation({ config: result.value });

  const { server, port } = await app.listen();
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
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
