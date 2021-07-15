import { main } from "effection";
import { createSimulationServer } from "@simulacrum/server";
import { auth0 } from "@simulacrum/auth0";
import { createClient } from "@simulacrum/client";

const port = Number(process.env.PORT) || 4000;

main(function* () {
  // starts up the overall simulation server
  let server = yield createSimulationServer({
    port,
    simulators: { auth0 },
  });

  let url = `http://localhost:${server.address.port}`;

  console.log(`simulation server running at ${url}`);

  let client = createClient(url);

  let simulation = yield client.createSimulation("auth0", {
    options: {
      audience: "https://your-audience/",
      scope: "openid profile read:shows",
      clientId: "YOUR_AUTH0_CLIENT_ID",
    },
    services: {
      auth0: {
        port: 4400,
      },
    },
  });
  console.log(simulation);
  let person = yield client.given(simulation, "person");

  console.log(`store populated with user`);
  console.log(`username = ${person.data.email} password = ${person.data.password}`);

  yield; // this keeps the server running, a function of effection
});
