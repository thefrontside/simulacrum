#!/usr/bin/env node
const { createContext } = require("configliere");
const { auth0Program, readJsonConfig, simulation, defaultUser } = require("../dist/index.cjs");

const args = process.argv.slice(2);
const envs = [{ name: "env", value: /** @type {Record<string, string>} */ (process.env) }];

async function main() {
  let parser = auth0Program.parse({ args, envs });

  if (!parser.ok) {
    throw parser.error;
  }

  if (parser.value.help) {
    console.log(auth0Program.help({ args }));
    return;
  }

  if (parser.value.version) {
    console.log(parser.value.version);
    return;
  }

  const command = parser.value.config;

  if (command.help) {
    console.log(command.text);
    return;
  }

  switch (command.name) {
    case "start": {
      let configPath = command.config.config;
      let values = configPath ? [{ name: configPath, value: readJsonConfig(configPath) }] : [];
      let configParser = command.config.next(values[0]?.value ?? {});
      let input = {
        args: parser.remainder.args ?? [],
        envs: parser.remainder.envs ?? envs,
        values,
      };
      let result = configParser.parse(input, createContext(input));

      if (!result.ok) {
        throw result.error;
      }

      const app = simulation({ config: result.value });

      /** @param {{ server: any; port: any }} listening */
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
      return;
    }
    default:
      throw new TypeError(`Unknown command ${command.name}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
