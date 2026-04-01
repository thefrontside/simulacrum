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
app.listen(undefined, () =>
  console.log(
    `auth0 simulation server started at https://localhost:4400\nusername: default@example.com\npassword: 12345\n`,
  ),
);
