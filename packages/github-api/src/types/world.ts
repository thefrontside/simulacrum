import type { GithubAccount, GithubCommit, GithubOrganization, GithubRef, GithubRepository, GithubTeam, GithubTeamMembership, User } from './graphql';
import type { GraphGen } from '@frontside/graphgen';

export interface World {
  User: User;
  GithubAccount: GithubAccount;
  GithubCommit: GithubCommit;
  GithubOrganization: GithubOrganization;
  GithubRef: GithubRef;
  GithubRepository: GithubRepository;
  GithubTeam: GithubTeam;
  GithubTeamMembership: GithubTeamMembership;
}

export type Factory = GraphGen<World>;
