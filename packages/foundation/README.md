# `@simulacrum/foundation-simulator`

This simulator gives some base level functionality which is likely to be used in every simulator. It is built with the expectation to be extended and meet your needs for any custom simulators as well. If you need assistance in building a simulator for your needs, please reach out to [Frontside for this or any other consulting services](https://frontside.com/).

## Extending The Simulator Data

This is a base simulator which wires together a few libraries to create a foundation where we may incrementally improve and make the simulating an endpoint more dynamic. It uses the following libraries which you may also refer to their docs as required.

- [express](https://expressjs.com/) for API route handling
- [openapi-backend](https://openapistack.co/docs/openapi-backend/intro/) to bootstrap and ensure the supplied OpenAPI specification's contract
- [starfx](https://starfx.bower.sh/) for handling the simulation state and side-effects (such as firing off webhooks and inter-simulation communication)
  - [effection](https://frontside.com/effection) used internally in starfx to handle events, side-effects and communication through structured concurrency

The foundation simulator includes a base route at `localhost:<port>` which notes all of the routes and a simple log of requests.

See the `./example` and `./tests` folders for integrated examples along with the API reference below. Additionally, other simulators within the monorepo and `@simulacrum` namespace are being built atop this foundation.

## API Reference

### `port`

Pass a port number that may be used instead of the default, `9000`.

### `serveJsonFiles`

This takes a path pointing to a directory of JSON files. It is the quickest method to get started and will establish routes for each JSON file based on the directory and filename. The primary use case and API method is `GET` requests.

### `openapi`

If the API that is being simulated maintains an OpenAPI 3.0 specification, the simulator can use that to define routes, provide mock data (contained within the specification), validate payloads and responses, and establish handlers for custom route handling.

### `extendRouter`

For custom routes and responses, this API uses `express` directly. It supports any API method that `express` supports: `GET`, `POST`, `DELETE`, etc.

### `extendStore`

To further customize the data and in-memory, immutable store, this API supports extending the internal `immer` store. This API relies on `starfx` heavily, and those docs may also serve as an appropriate reference.

The `openpi` and `extendRouter` APIs both include the `simulationStore` passed in as an arguement to provide an in-memory, mutable store.

### `delayResponses`

This API wraps each API and allows configuration to delay a response. The improves the "real" feel of the simulator that your frontend may load and react more closely to the deployed state.

We have implemented the following in simulators to set a default, but dynamically increase the delay in for testing specific cases.

```js
const slowResponse = process.env?.SLOW_RESPONSE
  ? process.env.SLOW_RESPONSE === "true"
    ? 800
    : parseInt(process.env.SLOW_RESPONSE, 10)
  : 0;

export const simulation = createFoundationSimulationServer({
  port: 9999,
  delayResponses: {
    minimum: 50 + slowResponse,
    maximum: 1000 + slowResponse * 5,
  },
});
```
