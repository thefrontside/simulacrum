import { simulation } from "./basic-sim-1.ts";

simulation()
  .listen(3301)
  .then(() => {
    console.log("Basic simulation 1 started on port 3301");
  });
