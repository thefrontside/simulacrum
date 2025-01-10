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
  repositories: (
    n: string
  ) => TableOutput<
    GitHubRepositories,
    AnyState,
    GitHubRepositories | undefined
  >;
  organizations: (
    n: string
  ) => TableOutput<
    GitHubOrganizations,
    AnyState,
    GitHubOrganizations | undefined
  >;
  blobs: (
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

export interface GitHubBlob {
  id: string;
  content: string;
  encoding: "string" | "base64";
  owner: string;
  repo: string;
  path: string;
  sha: string;
}

const inputSchema =
  (initialState: any) =>
  ({ slice }: ExtendSimulationSchema) => {
    let slices = {
      users: slice.table<GitHubUser>({
        initialState: initialState.users,
      }),
      repositories: slice.table<GitHubRepositories>({
        initialState: initialState.repositories,
      }),
      organizations: slice.table<GitHubOrganizations>({
        initialState: initialState.organizations,
      }),
      blobs: slice.table<GitHubBlob>({
        initialState: initialState.blobs,
      }),
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
  const allGithubOrganizations = createSelector(
    schema.organizations.selectTableAsList,
    (ghOrgs) => {
      return ghOrgs;
    }
  );

  const getBlob = createSelector(
    schema.blobs.selectTableAsList,
    (_state: AnyState, owner: string, repo: string, sha_or_path: string) => ({
      owner,
      repo,
      sha_or_path,
    }),
    (blobs, { owner, repo, sha_or_path }) => {
      const blob = blobs.find(
        (blob) =>
          blob.owner === owner &&
          blob.repo === repo &&
          (blob.path === sha_or_path || blob.sha === sha_or_path)
      );
      return blob;
    }
  );

  const getBlobAtOwnerRepo = createSelector(
    schema.blobs.selectTableAsList,
    (_state: AnyState, owner: string, repo: string) => ({
      owner,
      repo,
    }),
    (blobs, { owner, repo }) => {
      const blob = blobs.filter(
        (blob) => blob.owner === owner && blob.repo === repo
      );
      return blob;
    }
  );

  return { allGithubOrganizations, getBlob, getBlobAtOwnerRepo };
};

export const extendStore = (initialState: any) => ({
  actions: inputActions,
  selectors: inputSelectors,
  schema: inputSchema(initialState),
});
