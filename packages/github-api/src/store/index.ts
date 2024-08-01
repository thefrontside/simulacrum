import type {
  SimulationStore,
  ExtendSimulationActions,
  ExtendSimulationSelectors,
  ExtendSimulationSchema,
} from "@simulacrum/foundation-simulator";

export type ExtendedSchema = typeof inputSchema;
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>
>;

const inputSchema = ({ slice }: ExtendSimulationSchema) => {
  let slices = {
    users: slice.table({
      initialState: {
        "user:1": {
          id: "user:1",
          firstName: "Default",
          lastName: "User",
          organizations: ["githuborganization:1"],
        },
      },
    }),
    githubRepositories: slice.table(),
    githubOrganizations: slice.table({
      initialState: {
        "githuborganization:1": {
          id: "githuborganization:1",
          login: "default-org",
          entityName: "",
          name: "login",
          email: "org@example.com",
          description: "Default Org",
          createdAt: Date.now(),
          teams: [],
        },
      },
    }),
    blob: slice.table(),
  };
  return slices;
};

const inputActions = ({
  thunks,
  schema,
}: ExtendSimulationActions<ExtendedSchema>) => {
  return {};
};

const inputSelectors = ({
  createSelector,
  schema,
}: ExtendSimulationSelectors<ExtendedSchema>) => {
  return {};
};

export const extendStore = {
  actions: inputActions,
  selectors: inputSelectors,
  schema: inputSchema,
};
