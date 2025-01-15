import type { PageArgs } from "./relay";
import { applyRelayPagination } from "./relay";
import type { ExtendedSimulationStore } from "../store";
import type { AnyState } from "@simulacrum/foundation-simulator";
import type {
  User,
  Repository,
  Organization,
  Team,
} from "../__generated__/resolvers-types";

interface GraphQLData {
  User: User;
  Repository: Repository;
  Organization: Organization;
  Team: Team;
}

export function toGraphql<T extends keyof GraphQLData>(
  simulationStore: ExtendedSimulationStore,
  __typename: T,
  entity: AnyState
): Pick<GraphQLData, T>[T] {
  switch (__typename) {
    case "User":
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      return {
        __typename,
        ...entity,
        ...toGithubRepositoryOwner(simulationStore, __typename, entity as User),
        name: entity.name,
        bio: entity.bio,
        createdAt: entity.createdAt,
        organizations(pageArgs: PageArgs) {
          return applyRelayPagination(
            simulationStore.schema.organizations.selectByIds(
              simulationStore.store.getState(),
              {
                ids: entity.organizations,
              }
            ),
            pageArgs,
            (org) => toGraphql(simulationStore, "Organization", org)
          );
        },
      };
    case "Repository":
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      return {
        name: entity.name,
        description: entity.description,
        nameWithOwner: entity.nameWithOwner,
        login: entity.login,
        url: entity.url,
        createdAt: entity.createdAt,
        collaborators(pageArgs: PageArgs) {
          return applyRelayPagination(entity.collaborators, pageArgs);
        },
        owner(pageArgs: PageArgs) {
          return toGraphql(simulationStore, entity.owner, pageArgs);
        },
        defaultBranchRef: {
          name: entity.defaultBranchRef.name,
          target: entity.defaultBranchRef.target,
        },
        languages(pageArgs: PageArgs) {
          return applyRelayPagination(entity.languages, pageArgs, (l) => ({
            name: l,
          }));
        },
        repositoryTopics(pageArgs: PageArgs) {
          return applyRelayPagination(
            entity.repositoryTopics,
            pageArgs,
            (t) => ({
              topic: { name: t },
            })
          );
        },
        visibility: entity.visibility,
        isArchived: entity.isArchived,
      };
    case "Organization":
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      return {
        ...toGithubRepositoryOwner(
          simulationStore,
          __typename,
          entity as Organization
        ),
        __typename,
        id: entity.id,
        name: entity.name,
        description: entity.description,
        email: entity.email,
        createdAt: entity.createdAt,
        teams(pageArgs: PageArgs) {
          return applyRelayPagination(entity.teams, pageArgs, (team: Team) =>
            toGraphql(simulationStore, "Team", team)
          );
        },
      };
    default:
      // @ts-expect-error not a fully qualified return per type, TODO fill it out
      return entity;
  }
}

/*
  Represents the RepositoryOwner interface
*/
function toGithubRepositoryOwner(
  simulationStore: ExtendedSimulationStore,
  __typename: string,
  entity: AnyState
) {
  return {
    avatarUrl: entity.avatarUrl,
    login: entity.login,
    repositories(pageArgs: PageArgs) {
      return applyRelayPagination(
        // @ts-expect-error not a fully qualified return per type, TODO fill it out
        simulationStore.schema.repositories.selectByIds(
          simulationStore.store.getState(),
          {
            ids: entity.repositories,
          }
        ),
        pageArgs,
        (repository: Repository) =>
          toGraphql(simulationStore, "Repository", repository)
      );
    },
    resourcePath: entity.resourcePath,
    url: entity.url,
  };
}
