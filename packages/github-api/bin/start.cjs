#!/usr/bin/env node
const githubAPIsimulator = require("../dist/cjs/index");

const app = githubAPIsimulator.simulation();
app.listen(3300, () =>
  console.log(`github-api simulation server started at http://localhost:3300`)
);
