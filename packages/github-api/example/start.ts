import { simulation } from "../src/index";

let app = simulation();
app.listen(3300, () =>
  console.log(`foundation server started at http://localhost:3300`)
);
