import type {
  SimulationStore,
  ExtendSimulationActions,
  ExtendSimulationSelectors,
  ExtendSimulationSchema,
  TableOutput,
  AnyState,
} from "@simulacrum/foundation-simulator";

export type ExtendedSchema = ({ slice }: ExtendSimulationSchema) => {
  users: (
    n: string
  ) => TableOutput<GitHubUser, AnyState, GitHubUser | undefined>;
  githubRepositories: (
    n: string
  ) => TableOutput<
    GitHubRepositories,
    AnyState,
    GitHubRepositories | undefined
  >;
  githubOrganizations: (
    n: string
  ) => TableOutput<
    GitHubOrganizations,
    AnyState,
    GitHubOrganizations | undefined
  >;
  blob: (
    n: string
  ) => TableOutput<GitHubBlob, AnyState, GitHubBlob | undefined>;
};
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>
>;

interface GitHubUser {
  id: string;
  firstName: string;
  lastName: string;
  login: string;
  organizations: string[];
}

interface GitHubRepositories {
  id: string;
  name: string;
  nameWithOwner: string;
  packages?: string[];
}

interface GitHubOrganizations {
  id: string;
  login: string;
  entityName: string;
  name: string;
  email: string;
  description: string;
  createdAt: number;
  teams: string[] | undefined;
}

interface GitHubBlob {}

const inputSchema = ({ slice }: ExtendSimulationSchema) => {
  let slices = {
    users: slice.table<GitHubUser>({
      initialState: {
        "user:1": {
          id: "user:1",
          firstName: "Default",
          lastName: "User",
          login: "defaultUser",
          organizations: ["githuborganization:1"],
        },
      },
    }),
    githubRepositories: slice.table<GitHubRepositories>(),
    githubOrganizations: slice.table<GitHubOrganizations>({
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
    blob: slice.table<GitHubBlob>(),
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
