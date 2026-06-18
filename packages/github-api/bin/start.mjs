#!/usr/bin/env node
import { simulation } from "../dist/index.mjs";

const app = simulation();
app.listen(3300, () =>
  console.log(`github-api simulation server started at http://localhost:3300`),
);
