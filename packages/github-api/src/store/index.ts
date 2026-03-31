import type {
  SimulationStore,
  ExtendSimulationSchema,
  ExtendSimulationSchemaInput,
  ExtendSimulationActions,
  ExtendSimulationActionsInput,
  ExtendSimulationSelectors,
  ExtendSimulationSelectorsInput,
  AnyState,
  ExtendSimulationActionsInputLoose,
  ExtendSimulationSelectorsInputLoose,
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

// Concrete, exported types for downstream consumers to import and use
// when they need to reference the GitHub package's store generics.
export type GitHubSchema = ReturnType<ExtendedSchema>;
export type GitHubActions = ReturnType<ExtendActions>;
export type GitHubSelectors = ReturnType<ExtendSelectors>;

export type ExtendedSimulationStore = SimulationStore<GitHubSchema, GitHubActions, GitHubSelectors>;

// Public type for consumers of this package to declare the shape of an
// `extendStore` argument. This wires the foundation `ExtendStoreConfig`
// generics to the concrete GitHub schema/actions/selectors types so callers
// get accurate typing when they provide schema/actions/selectors extensions.
export type GitHubExtendStoreInput = ExtendStoreConfig<
  GitHubSchema,
  GitHubActions,
  GitHubSelectors
>;

export type GitHubOrganizationWithRepositories = GitHubOrganization & {
  repositories: GitHubRepository[];
};

export type GitHubAppInstallationWithAccount = Omit<GitHubAppInstallation, "account"> & {
  account: GitHubOrganization;
  target_id?: GitHubOrganization["id"];
  target_type?: GitHubOrganization["type"];
};

export type GitHubRepoOwner = Omit<GitHubOrganization, "name" | "email"> & {
  id: number;
};

export type GitHubRepositoryWithOrganizationOwner = Omit<GitHubRepository, "id" | "owner"> & {
  id: number;
  owner: GitHubRepoOwner;
};

const inputSchema =
  <T>(initialState?: GitHubStore, extendedSchema?: ExtendSimulationSchemaInput<T>) =>
  ({ slice }: ExtendSimulationSchema) => {
    const storeInitialState = convertInitialStateToStoreState(initialState);
    const extended = extendedSchema ? extendedSchema({ slice }) : {};
    let slices = {
      users: slice.table<GitHubUser>(
        !storeInitialState ? {} : { initialState: storeInitialState.users },
      ),
      installations: slice.table<GitHubAppInstallation>(
        !storeInitialState ? {} : { initialState: storeInitialState.installations },
      ),
      repositories: slice.table<GitHubRepository>(
        !storeInitialState ? {} : { initialState: storeInitialState.repositories },
      ),
      branches: slice.table<GitHubBranch>(
        !storeInitialState ? {} : { initialState: storeInitialState.branches },
      ),
      organizations: slice.table<GitHubOrganization>(
        !storeInitialState ? {} : { initialState: storeInitialState.organizations },
      ),
      blobs: slice.table<GitHubBlob>(
        !storeInitialState ? {} : { initialState: storeInitialState.blobs },
      ),
      ...extended,
    };
    return slices;
  };

const inputActions = (
  _args: ExtendSimulationActions<ExtendedSchema>,
): ExtendSimulationActions<ExtendedSchema> => {
  return {} as ExtendSimulationActions<ExtendedSchema>;
};

const extendActions =
  (extendedActions?: ExtendSimulationActionsInputLoose<GitHubActions, GitHubSchema>) =>
  (args: ExtendSimulationActions<ExtendedSchema>) => {
    const base = inputActions(args);
    if (!extendedActions) return base;
    const extResult = extendedActions(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as GitHubActions;
  };

const inputSelectors = ({ createSelector, schema }: ExtendSimulationSelectors<ExtendedSchema>) => {
  const allGithubOrganizations: (state: AnyState) => GitHubOrganizationWithRepositories[] =
    createSelector(
      schema.organizations.selectTableAsList,
      schema.repositories.selectTableAsList,
      (ghOrgs, repos) => {
        return ghOrgs.map((ghOrg) => {
          const repositories = repos.filter((r) => r.owner === ghOrg.login);
          return { ...ghOrg, repositories };
        });
      },
    );

  const getAppInstallation: (
    state: AnyState,
    org: string,
    repo?: string,
  ) => GitHubAppInstallationWithAccount | undefined = createSelector(
    schema.installations.selectTableAsList,
    schema.organizations.selectTableAsList,
    schema.repositories.selectTableAsList,
    (_state: AnyState, org: string, _repo?: string) => org,
    (_state: AnyState, _org: string, repo?: string) => repo,
    (installations, orgs, repos, org, repo) => {
      const appInstall = installations.find((install) => install.account === org);
      if (!appInstall) return undefined;
      let account = undefined;
      if (repo) {
        const repoData = repos.find((r) => r.owner === appInstall?.account && r.name === repo);
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
    },
  );

  const allReposWithOrgs: (
    state: AnyState,
    org?: string,
  ) => GitHubRepositoryWithOrganizationOwner[] | undefined = createSelector(
    schema.repositories.selectTableAsList,
    schema.organizations.selectTable,
    (_: AnyState, org?: string) => org,
    (allRepos, orgMap, org) => {
      if (org && !orgMap?.[org]) return undefined;
      const repos = !org ? allRepos : allRepos.filter((r) => r.owner === org);
      return repos.map((repo) => {
        const linkedRepo = {
          ...repo,
          id: Number(repo.id),
          owner: { ...orgMap[repo.owner], id: Number(orgMap[repo.owner].id) },
        };
        // TODO better option than delete?
        delete linkedRepo.owner.name;
        delete linkedRepo.owner.email;
        return linkedRepo;
      });
    },
  );

  const getBlob: (
    state: AnyState,
    owner: string,
    repo: string,
    sha_or_path: string,
  ) => GitHubBlob | undefined = createSelector(
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
          (blob.path === sha_or_path || blob.sha === sha_or_path),
      );
      return blob;
    },
  );

  const getBlobAtOwnerRepo: (state: AnyState, owner: string, repo: string) => GitHubBlob[] =
    createSelector(
      schema.blobs.selectTableAsList,
      (_state: AnyState, owner: string, repo: string) => ({
        owner,
        repo,
      }),
      (blobs, { owner, repo }) => {
        const blob = blobs.filter((blob) => blob.owner === owner && blob.repo === repo);
        return blob;
      },
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
  (extendedSelectors?: ExtendSimulationSelectorsInputLoose<GitHubSelectors, GitHubSchema>) =>
  (args: ExtendSimulationSelectors<ExtendedSchema>) => {
    const base = inputSelectors(args);
    if (!extendedSelectors) return base;
    const extResult = extendedSelectors(args);
    return {
      ...(base as object),
      ...(extResult as object),
    } as GitHubSelectors;
  };

export const extendStore = (
  initialState: GitHubStore | undefined,
  extended?: GitHubExtendStoreInput,
): {
  schema: ExtendSimulationSchemaInput<GitHubSchema>;
  actions?: ExtendSimulationActionsInput<GitHubActions, GitHubSchema>;
  selectors?: ExtendSimulationSelectorsInput<GitHubSelectors, GitHubSchema>;
  logs?: boolean;
} => ({
  actions: extendActions(extended?.actions),
  selectors: extendSelectors(extended?.selectors),
  schema: inputSchema(initialState, extended?.schema),
});
