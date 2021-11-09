import { main, MainError } from 'effection';

import { createClient } from '@simulacrum/client';

main(function*() {

  let [,,port] = process.argv;

  if (!port || isNaN(Number(port))) {
    fail(`must pass a valid port number, instead got '${port}'`);
  }

  let client = createClient('http://localhost:4001');


  try {
    let simulation = yield client.createSimulation("stripe", {
      services: {
        stripe: {
          port: Number(port)
        }
      }
    });

    if (simulation.status != 'running') {
      fail(`failed to start simulation`);
    }

    console.log(`created simulation: ${simulation.id}`);
    for (let service of simulation.services) {
      console.log(`${service.name}: ${service.url}`);
    }
  } finally {
    yield client.dispose();
  }
});


function fail(message) {
  throw new MainError({ message, exitCode: 1 });
}
