import { type InitialState, simulation } from "../src/index.ts";

const initialState: InitialState = {
  users: [{ login: "test", organizations: ["frontside"] }],
  repositories: [{ name: "test-repo", owner: "frontside" }],
  organizations: [{ login: "frontside" }],
  branches: [{ name: "main" }],
  blobs: [],
};

let app = simulation({ initialState });
app.listen(3300, () =>
  console.log(
    `GitHub API Simulation server started at http://localhost:3300\nVisit http://localhost:3300/simulation to view all available routes.`,
  ),
);
