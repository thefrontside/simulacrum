import type { GithubRepository } from '../types/graphql';
import type { PageArgs } from '../relay';
import { applyRelayPagination } from '../relay';

export function requestRepositories(
  githubRepositories: GithubRepository[],
  pageArgs: PageArgs,
) {
  let repos = githubRepositories.map(r => requestRepository(r));
  return applyRelayPagination(repos, pageArgs);
}

export function requestRepository(repository: GithubRepository) {
  return {
    name: repository.name,
    isArchived: repository.isArchived,
    nameWithOwner: repository.nameWithOwner,
    repositoryTopics: {
      nodes: repository.repositoryTopics.map(t => ({
        topic: { name: t },
      })),
    },
    languages: {
      nodes: repository.languages.map(l => ({
        name: l,
      })),
    },
    url: repository.url,
    visibility: repository.visibility,
    owner: {
      __typename:
        repository.owner.__typename === 'GithubOrganization'
          ? 'Organization'
          : 'User',
      login: repository.owner.login,
      name: repository.owner.name,
      url: repository.owner.url,
    },
  };
}
