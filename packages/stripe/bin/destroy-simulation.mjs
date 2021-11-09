import { main, MainError } from 'effection';

import { createClient } from '@simulacrum/client';

main(function* destroy() {

  let [,,id] = process.argv;

  if (!id) {
    fail(`must pass a simulation id`);
  }

  let client = createClient('http://localhost:4001');

  try {
    if (yield client.destroySimulation({ id })) {
      console.log(`successfully destroyed simulation ${id}`);
    } else {
      console.log(`simulation '${id}' does not exist or is already destroyed`);
    }
  } finally {
    yield client.dispose();
  }
});


function fail(message) {
  throw new MainError({ message, exitCode: 1 });
}
