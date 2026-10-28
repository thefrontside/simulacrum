import { getConfig, simulation } from "../src/index.ts";

const config = getConfig();
let app = simulation({
  config,
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
  const rawHost =
    typeof info === "object" && info?.address && !["::", "0.0.0.0"].includes(info.address)
      ? info.address
      : "localhost";
  const host = rawHost.includes(":") ? `[${rawHost}]` : rawHost;
  console.log(
    `Auth0 simulation server started at ${config.protocol ?? "https"}://${host}:${port}\n` +
      `username: default@example.com\n` +
      `password: 12345\n`,
  );
});
