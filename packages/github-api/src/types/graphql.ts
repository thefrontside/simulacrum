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

export interface GithubAccount extends RepositoryOwner {
  __typename?: 'GithubAccount';
  bio: Scalars['String'];
  collaboratorOn: Array<GithubRepository>;
  createdAt: Scalars['String'];
  entityName: Scalars['String'];
  firstName: Scalars['String'];
  lastActive: Scalars['String'];
  lastName: Scalars['String'];
  name: Scalars['String'];
  organizations: Array<GithubOrganization>;
  teamMemberships: Array<GithubTeamMembership>;
  user: User;
}

export interface GithubCommit {
  __typename?: 'GithubCommit';
  message: Scalars['String'];
  numberOfAncestors: Scalars['Int'];
  sha: Scalars['String'];
}

export interface GithubOrganization extends RepositoryOwner {
  __typename?: 'GithubOrganization';
  createdAt: Scalars['String'];
  description: Scalars['String'];
  email: Scalars['String'];
  entityName: Scalars['String'];
  name: Scalars['String'];
  teams: Array<GithubTeam>;
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
  owner: GithubRepositoryOwner;
  repositoryTopics: Array<Scalars['String']>;
  url: Scalars['String'];
  visibility: Scalars['String'];
}

export type GithubRepositoryOwner = GithubAccount | GithubOrganization;

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

export interface RepositoryOwner {
  avatarUrl: Scalars['String'];
  login: Scalars['String'];
  repositories: Array<GithubRepository>;
  resourcePath: Scalars['String'];
  url: Scalars['String'];
}

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
