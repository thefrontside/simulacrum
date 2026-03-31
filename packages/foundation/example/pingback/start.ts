import { simulation as simOne } from "./server-one.ts";
import { simulation as simTwo } from "./server-two.ts";

let appOne = simOne();
let appTwo = simTwo();

appOne.listen(3050, () => console.log(`foundation server started at http://localhost:3050`));

appTwo.listen(3051, () => console.log(`foundation server started at http://localhost:3051`));
