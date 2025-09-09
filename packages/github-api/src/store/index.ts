import type {
  SimulationStore,
  ExtendSimulationSchema,
  ExtendSimulationSchemaInput,
  ExtendSimulationActions,
  ExtendSimulationActionsInput,
  ExtendSimulationSelectors,
  ExtendSimulationSelectorsInput,
  AnyState,
  ExtendStoreConfig,
} from "@simulacrum/foundation-simulator";
import {
  convertInitialStateToStoreState,
  type GitHubStore,
  type GitHubBlob,
  type GitHubOrganization,
  type GitHubRepository,
  type GitHubUser,
  type GitHubBranch,
  type GitHubAppInstallation,
} from "./entities.ts";

type ExtendedSchema = ReturnType<typeof inputSchema>;
type ExtendActions = typeof inputActions;
type ExtendSelectors = typeof inputSelectors;
export type ExtendedSimulationStore = SimulationStore<
  ReturnType<ExtendedSchema>,
  ReturnType<ExtendActions>,
  ReturnType<ExtendSelectors>
>;

// Public type for consumers of this package to declare the shape of an
// `extendStore` argument. It mirrors the foundation `ExtendStoreConfig`
// but wires the schema input type used by this package so callers can
// provide schema/actions/selectors extensions with correct generic params.
export type GitHubExtendStoreInput<TSchema, TActions, TSelectors> =
  ExtendStoreConfig<ExtendSimulationSchemaInput<TSchema>, TActions, TSelectors>;

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

const inputActions = (
  args: ExtendSimulationActions<ExtendedSchema>
): ExtendSimulationActions<ExtendedSchema> => {
  return {} as ExtendSimulationActions<ExtendedSchema>;
};

const extendActions =
  <A>(extendedActions?: ExtendSimulationActionsInput<A, ExtendedSchema>) =>
  (args: ExtendSimulationActions<ExtendedSchema>) => {
    const base = inputActions(args);
    if (!extendedActions) return base;

    // Call the extension through a narrow bridge type that returns a
    // Partial of the outward actions shape. We still cast the supplied
    // extension to the bridge to avoid introducing cyclical public types,
    // but the result is strongly-typed as a Partial of the expected shape.
    type BridgeActionFn = (
      arg: ExtendSimulationActions<ExtendedSchema>
    ) => Partial<ExtendSimulationActions<ExtendedSchema>>;
    const extResult = (extendedActions as unknown as BridgeActionFn)(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as ExtendSimulationActions<ExtendedSchema>;
  };

const inputSelectors = ({
  createSelector,
  schema,
}: ExtendSimulationSelectors<ExtendedSchema>) => {
  const allGithubOrganizations = createSelector(
    schema.organizations.selectTableAsList,
    (ghOrgs) => {
      return [...ghOrgs];
    }
  );

  const getAppInstallation = createSelector(
    schema.installations.selectTableAsList,
    schema.organizations.selectTableAsList,
    schema.repositories.selectTableAsList,
    (_: AnyState, org: string, repo?: string) => org,
    (_: AnyState, org: string, repo?: string) => repo,
    (installations, orgs, repos, org, repo) => {
      const appInstall = installations.find(
        (install) => install.account === org
      );
      if (!appInstall) return undefined;
      let account = undefined;
      if (repo) {
        const repoData = repos.find(
          (r) => r.owner === appInstall?.account && r.name === repo
        );
        if (repoData) account = orgs.find((o) => o.login === repoData.owner);
      } else {
        account = orgs.find((o) => o.login === appInstall?.account);
      }
      if (!account) return undefined;
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
    (_: AnyState, org?: string) => org,
    (allRepos, orgMap, org) => {
      if (org && !orgMap?.[org]) return undefined;
      const repos = !org ? allRepos : allRepos.filter((r) => r.owner === org);
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
  <S>(extendedSelectors?: ExtendSimulationSelectorsInput<S, ExtendedSchema>) =>
  (args: ExtendSimulationSelectors<ExtendedSchema>) => {
    const base = inputSelectors(args);
    if (!extendedSelectors) return base;

    // Call the extension through a narrow bridge type that returns a
    // Partial of the outward selectors shape. Casting to this bridge
    // preserves a nameable external signature while keeping useful types
    // for the merged result.
    type BridgeSelectorFn = (
      arg: ExtendSimulationSelectors<ExtendedSchema>
    ) => Partial<ExtendSimulationSelectors<ExtendedSchema>>;
    const extResult = (extendedSelectors as unknown as BridgeSelectorFn)(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as ExtendSimulationSelectors<ExtendedSchema>;
  };

export const extendStore = <T>(
  initialState: GitHubStore | undefined,
  extended?: ExtendStoreConfig<ExtendSimulationSchemaInput<T>, unknown, unknown>
) => ({
  actions: extendActions(
    extended?.actions as unknown as ExtendSimulationActionsInput<
      unknown,
      ExtendedSchema
    >
  ),
  selectors: extendSelectors(
    extended?.selectors as unknown as ExtendSimulationSelectorsInput<
      unknown,
      ExtendSimulationSchemaInput<T>
    >
  ),
  schema: inputSchema(initialState, extended?.schema),
});
