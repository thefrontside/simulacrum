import { simulation, defaultUser, getConfig } from "../src/index.ts";

let config = getConfig();
let port = config.port ?? 4400;
let authority = `https://localhost:${port}/${config.tenant}`;

let app = simulation({
  extend: {
    extendRouter: (router, _simulationStore) => {
      router.get("/hello", (_req, res) => {
        res.status(200).json({ message: "Hello from the Entra simulator!" });
      });
    },
  },
});

app.listen(port, () =>
  console.log(
    `Entra simulation server started at https://localhost:${port}\n` +
      `authority: ${authority}\n` +
      `username: ${defaultUser.email}\n` +
      `password: ${defaultUser.password}\n`,
  ),
);
