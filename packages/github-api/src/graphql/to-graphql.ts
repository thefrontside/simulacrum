import type { PageArgs } from "./relay.ts";
import { applyRelayPagination } from "./relay.ts";
import type { ExtendedSimulationStore } from "../store/index.ts";
import type { GitHubUser, GitHubRepository, GitHubOrganization } from "../store/entities.ts";
import {
  type User,
  type Repository,
  type Organization,
  type Team,
  RepositoryVisibility,
} from "../__generated__/resolvers-types.ts";
import { assert } from "assert-ts";

interface GraphQLData {
  User: User;
  Repository: Repository;
  Organization: Organization;
  Team: Team;
}
interface DataSchemas {
  User: GitHubUser;
  Repository: GitHubRepository;
  Organization: GitHubOrganization;
}

export function deriveOwner(simulationStore: ExtendedSimulationStore, login: string) {
  let [org] = simulationStore.schema.organizations
    .selectTableAsList(simulationStore.store.getState())
    .filter((o) => o.login === login);
  if (org) return toGraphql(simulationStore, "Organization", org) as GraphQLData["Organization"];

  let [userAccount] = simulationStore.schema.users
    .selectTableAsList(simulationStore.store.getState())
    // TODO should we use u?.githubAccount?.login here?
    .filter((u) => u?.login === login);
  assert(!!userAccount, `no github organization or account found for ${login}`);
  return toGraphql(simulationStore, "User", userAccount) as GraphQLData["User"];
}

export function toGraphql<T extends keyof (DataSchemas | GraphQLData)>(
  simulationStore: ExtendedSimulationStore,
  __typename: T,
  entity: DataSchemas[T],
): GraphQLData["User"] | GraphQLData["Repository"] | GraphQLData["Organization"] {
  switch (__typename) {
    case "User":
      const user = entity as DataSchemas["User"];
      const gqlUser: GraphQLData["User"] = {
        ...toGithubRepositoryOwner(simulationStore, __typename, user),
        __typename,
        id: user.id.toString(),
        name: user.name,
        bio: user.bio,
        createdAt: user.created_at,
        // @ts-expect-error type mismatch as it doesn't perfectly align with *Connection
        organizations(pageArgs: PageArgs) {
          return applyRelayPagination(
            simulationStore.schema.organizations.selectByIds(simulationStore.store.getState(), {
              ids: user.organizations,
            }),
            pageArgs,
            (org) => toGraphql(simulationStore, "Organization", org),
          );
        },
      };
      return gqlUser;
    case "Organization":
      const org = entity as DataSchemas["Organization"];
      const gqlOrg: GraphQLData["Organization"] = {
        ...toGithubRepositoryOwner(simulationStore, __typename, org),
        __typename,
        id: org.id.toString(),
        name: org.name,
        description: org.description,
        email: org.email,
        createdAt: org.created_at,
        // @ts-expect-error type mismatch as it doesn't perfectly align with *Connection
        teams(pageArgs: PageArgs) {
          return applyRelayPagination([], pageArgs, (team: Team) => team);
        },
        // @ts-expect-error type mismatch as it doesn't perfectly align with *Connection
        membersWithRole(pageArgs: PageArgs) {
          return applyRelayPagination([], pageArgs, (team: Team) => team);
        },
      };
      return gqlOrg;
    case "Repository":
      const repo = entity as DataSchemas["Repository"];
      const gqlRepo: GraphQLData["Repository"] = {
        __typename,
        id: repo.id.toString(),
        name: repo.name,
        description: repo.description,
        nameWithOwner: repo.full_name,
        url: repo.url,
        createdAt: repo.created_at,
        // @ts-expect-error type mismatch as it doesn't perfectly align with *Connection
        collaborators(pageArgs: PageArgs) {
          // TODO fill in real collaborators
          return applyRelayPagination([], pageArgs);
        },
        get owner() {
          return deriveOwner(simulationStore, repo.owner);
        },
        // @ts-expect-error
        defaultBranchRef: {
          id: repo.default_branch,
          name: repo.default_branch,
        },
        // @ts-expect-error type mismatch as it doesn't perfectly align with *Connection
        languages(pageArgs: PageArgs) {
          return applyRelayPagination(
            repo.language ? [{ id: repo.language, name: repo.language }] : [],
            pageArgs,
          );
        },
        // @ts-expect-error type mismatch as it doesn't perfectly align with *Connection
        repositoryTopics(pageArgs: PageArgs) {
          return applyRelayPagination(repo.topics, pageArgs, (t) => ({
            topic: { name: t },
          }));
        },
        visibility:
          repo.visibility === "public" ? RepositoryVisibility.Public : RepositoryVisibility.Private,
        isArchived: repo.archived,
        isFork: repo.fork,
      };
      return gqlRepo;
    default:
      console.error(`toGraphql: unhandled __typename ${__typename}`, {
        entity,
      });
      throw new Error("derp");
  }
}

/*
  Represents the RepositoryOwner interface
*/
function toGithubRepositoryOwner(
  simulationStore: ExtendedSimulationStore,
  __typename: string,
  entity: DataSchemas["User"] | DataSchemas["Organization"],
) {
  return {
    avatarUrl: entity.avatar_url,
    login: entity.login,
    repositories(pageArgs: PageArgs) {
      return applyRelayPagination(
        simulationStore.schema.repositories
          .selectTableAsList(simulationStore.store.getState())
          .filter((repo) => repo.owner === entity.login),
        pageArgs,
        (repository: DataSchemas["Repository"]) =>
          toGraphql(simulationStore, "Repository", repository),
      );
    },
    // @ts-expect-error TODO fill in data properly
    resourcePath: entity.resourcePath,
    url: entity.url,
  };
}
