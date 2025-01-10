import type {
  SimulationStore,
  ExtendSimulationActions,
  ExtendSimulationSelectors,
  ExtendSimulationSchema,
  TableOutput,
  AnyState,
} from "@simulacrum/foundation-simulator";
import {
  convertInitialStateToStoreState,
  type GitHubStore,
  type GitHubBlob,
  type GitHubInitialStore,
  type GitHubOrganization,
  type GitHubRepository,
  type GitHubUser,
} from "./entities";

export type ExtendedSchema = ({ slice }: ExtendSimulationSchema) => {
  users: (
    n: string
  ) => TableOutput<GitHubUser, AnyState, GitHubUser | undefined>;
  repositories: (
    n: string
  ) => TableOutput<GitHubRepository, AnyState, GitHubRepository | undefined>;
  organizations: (
    n: string
  ) => TableOutput<
    GitHubOrganization,
    AnyState,
    GitHubOrganization | undefined
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

const inputSchema =
  (initialState?: GitHubStore) =>
  ({ slice }: ExtendSimulationSchema) => {
    const storeInitialState = !initialState
      ? undefined
      : convertInitialStateToStoreState(initialState);
    let slices = {
      users: slice.table<GitHubUser>(
        !storeInitialState ? {} : { initialState: storeInitialState.users }
      ),
      repositories: slice.table<GitHubRepository>(
        !storeInitialState
          ? {}
          : { initialState: storeInitialState.repositories }
      ),
      organizations: slice.table<GitHubOrganization>(
        !storeInitialState
          ? {}
          : { initialState: storeInitialState.organizations }
      ),
      blobs: slice.table<GitHubBlob>(
        !storeInitialState ? {} : { initialState: storeInitialState.blobs }
      ),
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

export const extendStore = (initialState?: GitHubStore) => ({
  actions: inputActions,
  selectors: inputSelectors,
  schema: inputSchema(initialState),
});
