import { ResourceServiceCreator } from "@simulacrum/server";
import { spawn } from "effection";
import fastify from 'fastify';

import type { AddressInfo } from 'net';

export const createStripeService: ResourceServiceCreator = (slice, options) => ({
  *init() {
    let app = fastify();

    // add some routes to the service
    app.get('/v1/payment_intents', async (req, res) => {
      return {
        "id": "pi_1DRuHnHgsMRlo4MtwuIAUe6u",
        "object": "payment_intent",
        "amount": 1000,
        "amount_capturable": 0,
        "amount_received": 0,
        "application": null,
        "application_fee_amount": null,
        "canceled_at": null,
        "cancellation_reason": null,
        "capture_method": "automatic",
        "charges": {
          "object": "list",
          "data": [],
          "has_more": false,
          "total_count": 0,
          "url": "/v1/charges?payment_intent=pi_1DRuHnHgsMRlo4MtwuIAUe6u"
        },
        "client_secret": "{{PAYMENT_INTENT_CLIENT_SECRET}}",
        "confirmation_method": "automatic",
        "created": 1556123069,
        "currency": "usd",
        "customer": null,
        "description": null,
        "invoice": null,
        "last_payment_error": null,
        "livemode": false,
        "metadata": {},
        "next_action": null,
        "on_behalf_of": null,
        "payment_method": null,
        "payment_method_types": [
          "card"
        ],
        "receipt_email": "jenny.rosen@example.com",
        "review": null,
        "shipping": null,
        "source": null,
        "statement_descriptor": null,
        "status": "requires_payment_method",
        "transfer_data": null,
        "transfer_group": null
      };
    });

    // shutdown the app, whenever this simulation is closed
    yield spawn(function*() {
      try {
        yield;
      } finally {
        yield app.close();
      }
    });

    //listen on the specified port. If no port specified, it will be random.
    yield app.listen(options.port);

    let address = app.server.address() as AddressInfo;

    // return the port and protocol for simulacrum to report
    return {
      port: address.port,
      protocol: 'http'
    };
  }
});
