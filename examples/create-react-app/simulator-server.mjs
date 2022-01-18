import { main } from "effection";
import { createSimulationServer } from "@simulacrum/server";
import { auth0 } from "@simulacrum/auth0-simulator";
import { createClient } from "@simulacrum/client";
import { readFile } from 'fs/promises';

const port = Number(process.env.PORT) || 4000; // port for the main simulation service

main(function* () {
  // starts up the overall simulation server
  let server = yield createSimulationServer({
    port,
    simulators: { auth0 },
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(`simulation server running at ${url}`);

  let client = createClient(url);

  const authConfig = JSON.parse(
    yield readFile(
      new URL('./src/auth_config.json', import.meta.url)
    )
  );

  let simulation = yield client.createSimulation("auth0", {
    options: {
      ...authConfig,
      rulesDirectory: "__mocks__/rules"
    },
    services: {
      auth0: {
        port: 4400, // port for the auth0 service itself
      },
    },
  });

  console.log(`auth0 service running at ${simulation.services[0].url}`);

  let person = yield client.given(simulation, "person", {
    email: "admin@org.com",
    password: "Passw0rd"
  });

  console.log(`store populated with user`);
  console.log(`username = ${person.data.email} password = ${person.data.password}`);

  yield; // this keeps the server running, a function of effection
});
