import { simulation } from "../src/index.ts";

let app = simulation({
  extend: {
    extendRouter: (router, _simulationStore) => {
      router.get("/hello", (_req, res) => {
        res.status(200).json({ message: "Hello from Auth0 simulator!" });
      });
    },
  },
});

app.listen().then(({ server, port }) => {
  const info = server.address();
  const host =
    typeof info === "object" && info?.address && !["::", "0.0.0.0"].includes(info.address)
      ? info.address
      : "localhost";
  console.log(
    `Auth0 simulation server started at https://${host}:${port}\n` +
      `username: default@example.com\n` +
      `password: 12345\n`,
  );
});
