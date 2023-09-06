import type {
  GithubRepository,
  GithubOrganization,
  User,
  GithubAccount,
} from "../types/graphql";
import type { PageArgs } from "../relay";
import { applyRelayPagination } from "../relay";
import assert from "assert-ts";

export function toGraphql(
  factory: GithubRepository | GithubOrganization | GithubAccount | User,
  as?: "GithubRepositoryOwner"
) {
  if (as) {
    switch (as) {
      case "GithubRepositoryOwner":
        assert(
          factory.__typename === "GithubOrganization" ||
            factory.__typename === "GithubAccount",
          `GithubRepositoryOwner requires type GithubOrganization or GithubAccount, received ${factory.__typename}`
        );
        return toGithubRepositoryOwner(factory);
    }
  } else {
    switch (factory.__typename) {
      case "GithubRepository":
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
          owner: toGithubRepositoryOwner(factory.owner),
          defaultBranchRef: {
            name: factory.defaultBranchRef.name,
            target: factory.defaultBranchRef.target,
          },
          languages: {
            nodes: factory.languages.map((l) => ({
              name: l,
            })),
          },
          repositoryTopics: {
            nodes: factory.repositoryTopics.map((t) => ({
              topic: { name: t },
            })),
          },
          visibility: factory.visibility,
          isArchived: factory.isArchived,
          entityName: factory.entityName,
        };
      case "GithubOrganization":
        return {
          __typename: "Organization",
          avatarUrl: factory.avatarUrl,
          login: factory.login,
          url: factory.url,
          resourcePath: factory.resourcePath,
          repositories(pageArgs: PageArgs) {
            return applyRelayPagination(factory.repositories, pageArgs, (r) =>
              toGraphql(r)
            );
          },
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
      case "GithubAccount":
        return {
          __typename: "User",
          avatarUrl: factory.avatarUrl,
          login: factory.login,
          url: factory.url,
          resourcePath: factory.resourcePath,
          repositories(pageArgs: PageArgs) {
            return applyRelayPagination(factory.repositories, pageArgs, (r) =>
              toGraphql(r)
            );
          },
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
}

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
