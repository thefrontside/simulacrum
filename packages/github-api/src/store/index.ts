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
  type GitHubOrganization,
  type GitHubRepository,
  type GitHubUser,
  type GitHubBranch,
  GitHubAppInstallation,
} from "./entities";
import type { ExtendSimulationSchemaInput } from "@simulacrum/foundation-simulator/src/store/schema";
import type {
  ExtendSimulationActionsInput,
  ExtendSimulationSelectorsInput,
} from "@simulacrum/foundation-simulator/src/store";

export type ExtendedSchema = ({ slice }: ExtendSimulationSchema) => {
  users: (
    n: string
  ) => TableOutput<GitHubUser, AnyState, GitHubUser | undefined>;
  installations: (
    n: string
  ) => TableOutput<
    GitHubAppInstallation,
    AnyState,
    GitHubAppInstallation | undefined
  >;
  repositories: (
    n: string
  ) => TableOutput<GitHubRepository, AnyState, GitHubRepository | undefined>;
  branches: (
    n: string
  ) => TableOutput<GitHubBranch, AnyState, GitHubBranch | undefined>;
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
  <T>(
    initialState?: GitHubStore,
    extendedSchema?: ExtendSimulationSchemaInput<T>
  ) =>
  ({ slice }: ExtendSimulationSchema) => {
    const storeInitialState = convertInitialStateToStoreState(initialState);
    const extended = extendedSchema ? extendedSchema({ slice }) : {};
    let slices = {
      users: slice.table<GitHubUser>(
        !storeInitialState ? {} : { initialState: storeInitialState.users }
      ),
      installations: slice.table<GitHubAppInstallation>(
        !storeInitialState
          ? {}
          : { initialState: storeInitialState.installations }
      ),
      repositories: slice.table<GitHubRepository>(
        !storeInitialState
          ? {}
          : { initialState: storeInitialState.repositories }
      ),
      branches: slice.table<GitHubBranch>(
        !storeInitialState ? {} : { initialState: storeInitialState.branches }
      ),
      organizations: slice.table<GitHubOrganization>(
        !storeInitialState
          ? {}
          : { initialState: storeInitialState.organizations }
      ),
      blobs: slice.table<GitHubBlob>(
        !storeInitialState ? {} : { initialState: storeInitialState.blobs }
      ),
      ...extended,
    };
    return slices;
  };

const inputActions = (args: ExtendSimulationActions<ExtendedSchema>) => {
  return {};
};

const extendActions =
  (extendedActions?: ExtendSimulationActionsInput<any, ExtendedSchema>) =>
  (args: ExtendSimulationActions<ExtendedSchema>) => {
    return extendedActions
      ? // @ts-expect-error schema is cyclical, ignore extension for now
        { ...inputActions(args), ...extendedActions(args) }
      : inputActions(args);
  };

const inputSelectors = (args: ExtendSimulationSelectors<ExtendedSchema>) => {
  const { createSelector, schema } = args;
  const allGithubOrganizations = createSelector(
    schema.organizations.selectTableAsList,
    (ghOrgs) => {
      return ghOrgs;
    }
  );

  const getAppInstallation = createSelector(
    schema.installations.selectTableAsList,
    schema.organizations.selectTableAsList,
    (_: AnyState, org: string) => org,
    (installations, orgs, org) => {
      const appInstall = installations.find(
        (install) => install.account === org
      );
      const account = orgs.find((o) => o.login === appInstall?.account);
      return {
        ...appInstall,
        account: { ...account },
        target_id: account?.id,
        target_type: account?.type,
      };
    }
  );

  const allReposWithOrgs = createSelector(
    schema.repositories.selectTableAsList,
    schema.organizations.selectTable,
    (repos, orgMap) => {
      return repos.map((repo) => {
        const linkedRepo = { ...repo, owner: { ...orgMap[repo.owner] } };
        // TODO better option than delete?
        delete linkedRepo.owner.name;
        delete linkedRepo.owner.email;
        return linkedRepo;
      });
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

  return {
    allGithubOrganizations,
    getAppInstallation,
    allReposWithOrgs,
    getBlob,
    getBlobAtOwnerRepo,
  };
};

const extendSelectors =
  (extendedSelectors?: ExtendSimulationSelectorsInput<any, ExtendedSchema>) =>
  (args: ExtendSimulationSelectors<ExtendedSchema>) => {
    return extendedSelectors
      ? // @ts-expect-error schema is cyclical, ignore extension for now
        { ...inputSelectors(args), ...extendedSelectors(args) }
      : inputSelectors(args);
  };

export const extendStore = <T>(
  initialState: GitHubStore | undefined,
  extended:
    | {
        actions: ExtendSimulationActionsInput<
          any,
          ExtendSimulationSchemaInput<T>
        >;
        selectors: ExtendSimulationSelectorsInput<
          any,
          ExtendSimulationSchemaInput<T>
        >;
        schema?: ExtendSimulationSchemaInput<T>;
      }
    | undefined
) => ({
  actions: extendActions(extended?.actions),
  selectors: extendSelectors(extended?.selectors),
  schema: inputSchema(initialState, extended?.schema),
});
