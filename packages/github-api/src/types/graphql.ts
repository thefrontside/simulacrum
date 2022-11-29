/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
}

export interface GithubAccount {
  __typename?: 'GithubAccount';
  avatarUrl: Scalars['String'];
  bio: Scalars['String'];
  collaboratorOn: Array<GithubRepository>;
  createdAt: Scalars['String'];
  entityName: Scalars['String'];
  firstName: Scalars['String'];
  lastActive: Scalars['String'];
  lastName: Scalars['String'];
  login: Scalars['String'];
  name: Scalars['String'];
  organizations: Array<GithubOrganization>;
  repositories: Array<GithubRepository>;
  teamMemberships: Array<GithubTeamMembership>;
  url: Scalars['String'];
  user: User;
}

export interface GithubCommit {
  __typename?: 'GithubCommit';
  message: Scalars['String'];
  numberOfAncestors: Scalars['Int'];
  sha: Scalars['String'];
}

export interface GithubOrganization {
  __typename?: 'GithubOrganization';
  avatarUrl: Scalars['String'];
  createdAt: Scalars['String'];
  description: Scalars['String'];
  email: Scalars['String'];
  entityName: Scalars['String'];
  login: Scalars['String'];
  name: Scalars['String'];
  repositories: Array<GithubRepository>;
  teams: Array<GithubTeam>;
  url: Scalars['String'];
}

export interface GithubRef {
  __typename?: 'GithubRef';
  name: Scalars['String'];
  target: GithubCommit;
}

export interface GithubRepository {
  __typename?: 'GithubRepository';
  collaborators: Array<GithubAccount>;
  createdAt: Scalars['String'];
  defaultBranchRef: GithubRef;
  description: Scalars['String'];
  entityName: Scalars['String'];
  isArchived: Scalars['Boolean'];
  languages: Array<Scalars['String']>;
  login: Scalars['String'];
  name: Scalars['String'];
  nameWithOwner: Scalars['String'];
  owner: RepositoryOwner;
  repositoryTopics: Array<Scalars['String']>;
  url: Scalars['String'];
  visibility: Scalars['String'];
}

export interface GithubTeam {
  __typename?: 'GithubTeam';
  entityName: Scalars['String'];
  members: Array<GithubTeamMembership>;
  name: Scalars['String'];
  organization: GithubOrganization;
  slug: Scalars['String'];
  url: Scalars['String'];
}

export interface GithubTeamMembership {
  __typename?: 'GithubTeamMembership';
  githubAccount: GithubAccount;
  name: Scalars['String'];
  team: GithubTeam;
}

export type RepositoryOwner = GithubAccount | GithubOrganization;

export interface User {
  __typename?: 'User';
  displayName: Scalars['String'];
  email: Scalars['String'];
  entityName: Scalars['String'];
  firstName: Scalars['String'];
  githubAccount: GithubAccount;
  lastName: Scalars['String'];
  name: Scalars['String'];
  picture: Scalars['String'];
}
