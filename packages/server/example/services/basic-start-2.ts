import { simulation } from "./basic-sim-2.ts";

simulation()
  .listen(3302)
  .then(() => {
    console.log("Basic simulation 2 started on port 3302");
  });
