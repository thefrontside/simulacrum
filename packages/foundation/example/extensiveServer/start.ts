import { simulation } from "./index.ts";

let app = simulation();
app.listen(undefined, () => console.log(`foundation server started at http://localhost:9999`));
