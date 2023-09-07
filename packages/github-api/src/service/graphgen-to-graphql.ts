import type {
  GithubRepository,
  GithubOrganization,
  User,
  GithubAccount,
} from '../types/graphql';
import type { PageArgs } from '../relay';
import { applyRelayPagination } from '../relay';

export function toGraphql(
  factory: GithubRepository | GithubOrganization | GithubAccount | User
) {
  switch (factory.__typename) {
    case 'GithubRepository':
      return {
        name: factory.name,
        description: factory.description,
        nameWithOwner: factory.nameWithOwner,
        login: factory.login,
        url: factory.url,
        createdAt: factory.createdAt,
        collaborators(pageArgs: PageArgs) {
          return applyRelayPagination(factory.collaborators, pageArgs);
        },
        owner() {
          return toGraphql(factory.owner);
        },
        defaultBranchRef: {
          name: factory.defaultBranchRef.name,
          target: factory.defaultBranchRef.target,
        },
        languages(pageArgs: PageArgs) {
          return applyRelayPagination(factory.languages, pageArgs, (l) => ({
            name: l,
          }));
        },
        repositoryTopics(pageArgs: PageArgs) {
          return applyRelayPagination(
            factory.repositoryTopics,
            pageArgs,
            (t) => ({ topic: { name: t } })
          );
        },
        visibility: factory.visibility,
        isArchived: factory.isArchived,
        entityName: factory.entityName,
      };
    case 'GithubOrganization':
      return {
        ...toGithubRepositoryOwner(factory),
        entityName: factory.entityName,
        name: factory.name,
        description: factory.description,
        email: factory.email,
        createdAt: factory.createdAt,
        teams(pageArgs: PageArgs) {
          return applyRelayPagination(factory.teams, pageArgs, (t) => ({
            ...t,
          }));
        },
      };
    case 'GithubAccount':
      return {
        ...toGithubRepositoryOwner(factory),
        firstName: factory.firstName,
        lastName: factory.lastName,
        name: factory.name,
        bio: factory.bio,
        lastActive: factory.lastActive,
        createdAt: factory.createdAt,
        organizations(pageArgs: PageArgs) {
          return applyRelayPagination(factory.organizations, pageArgs, (r) =>
            toGraphql(r)
          );
        },
        teamMemberships: factory.teamMemberships,
        collaboratorOn(pageArgs: PageArgs) {
          return applyRelayPagination(factory.collaboratorOn, pageArgs, (r) =>
            toGraphql(r)
          );
        },
      };
    default:
      return { ...factory };
  }
}

/*
  Represents the RepositoryOwner interface
*/
function toGithubRepositoryOwner(factory: GithubOrganization | GithubAccount) {
  return {
    __typename:
      factory.__typename === "GithubOrganization" ? "Organization" : "User",
    avatarUrl: factory.avatarUrl,
    login: factory.login,
    repositories(pageArgs: PageArgs) {
      return applyRelayPagination(factory.repositories, pageArgs, (r) =>
        toGraphql(r)
      );
    },
    resourcePath: factory.resourcePath,
    url: factory.url,
  };
}
