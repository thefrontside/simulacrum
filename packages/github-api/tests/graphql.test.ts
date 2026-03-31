import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { simulation } from "../src/index.ts";
import { graphql } from "@octokit/graphql";

let basePort = 3400;
let host = "http://localhost";
let url = `${host}:${basePort}`;

// for syntax highlighting
const gql = String.raw;
const headers = {
  authorization: "Bearer [REDACTED]",
  "Content-Type": "application/json",
};
const client = graphql.defaults({
  baseUrl: url,
});

describe.sequential("graphql queries", () => {
  let server;
  beforeAll(async () => {
    let app = simulation({
      initialState: {
        users: [{ login: "frontsidejack", organizations: ["lovel-org"] }],
        organizations: [{ login: "lovely-org" }],
        repositories: [{ owner: "lovely-org", name: "awesome-repo" }],
        branches: [{ name: "main" }],
        blobs: [],
      },
    });
    server = await app.listen(basePort);
  });
  afterAll(async () => {
    await server.ensureClose();
  });

  it("validates with 200 response", async () => {
    let request = await fetch(`${url}/graphql`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: gql`
          query repositories($org: String!) {
            repositoryOwner(login: $org) {
              login
              repositories(first: 50) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        `,
        variables: { org: "lovely-org" },
      }),
    });
    let response = await request.json();
    expect(request.status).toEqual(200);
    expect(response.errors).toBe(undefined);
  });

  describe("getOrganizationUsers", () => {
    const query = gql`
      query users($org: String!, $email: Boolean!, $cursor: String) {
        organization(login: $org) {
          membersWithRole(first: 100, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              avatarUrl
              bio
              email @include(if: $email)
              login
              name
              organizationVerifiedDomainEmails(login: $org)
            }
          }
        }
      }
    `;
    const variables = { org: "lovely-org", email: true };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationTeams", () => {
    const query = gql`
      query teams($org: String!, $cursor: String) {
        organization(login: $org) {
          teams(first: 50, after: $cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              slug
              combinedSlug
              name
              description
              avatarUrl
              editTeamUrl
              parentTeam {
                slug
              }
              members(first: 100, membership: IMMEDIATE) {
                pageInfo {
                  hasNextPage
                }
                nodes {
                  avatarUrl
                  bio
                  email
                  login
                  name
                  organizationVerifiedDomainEmails(login: $org)
                }
              }
            }
          }
        }
      }
    `;
    const variables = { org: "lovely-org" };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationTeamsFromUsers", () => {
    const query = gql`
      query teams($org: String!, $cursor: String, $userLogins: [String!] = "") {
        organization(login: $org) {
          teams(first: 100, after: $cursor, userLogins: $userLogins) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              slug
              combinedSlug
              name
              description
              avatarUrl
              editTeamUrl
              parentTeam {
                slug
              }
              members(first: 100, membership: IMMEDIATE) {
                pageInfo {
                  hasNextPage
                }
                nodes {
                  avatarUrl
                  bio
                  email
                  login
                  name
                  organizationVerifiedDomainEmails(login: $org)
                }
              }
            }
          }
        }
      }
    `;
    const variables = { org: "lovely-org", userLogins: ["frontsidejack"] };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationsFromUser", () => {
    const query = gql`
      query orgs($user: String!) {
        user(login: $user) {
          organizations(first: 100) {
            nodes {
              login
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;
    const variables = { user: "frontsidejack" };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationTeam", () => {
    const query = gql`
      query teams($org: String!, $teamSlug: String!) {
        organization(login: $org) {
          team(slug: $teamSlug) {
            slug
            combinedSlug
            name
            description
            avatarUrl
            editTeamUrl
            parentTeam {
              slug
            }
            members(first: 100, membership: IMMEDIATE) {
              pageInfo {
                hasNextPage
              }
              nodes {
                login
              }
            }
          }
        }
      }
    `;
    const variables = { org: "lovely-org", teamSlug: "boop" };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationRepositories", () => {
    const query = gql`
      query repositories($org: String!, $catalogPathRef: String!, $cursor: String) {
        repositoryOwner(login: $org) {
          login
          repositories(first: 50, after: $cursor) {
            nodes {
              name
              catalogInfoFile: object(expression: $catalogPathRef) {
                __typename
                ... on Blob {
                  id
                  text
                }
              }
              url
              isArchived
              isFork
              visibility
              repositoryTopics(first: 100) {
                nodes {
                  ... on RepositoryTopic {
                    topic {
                      name
                    }
                  }
                }
              }
              defaultBranchRef {
                name
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;
    const variables = {
      org: "lovely-org",
      catalogPathRef: "HEAD:catalog-info.yaml",
      cursor: undefined,
    };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
      expect(response.data.repositoryOwner.login).toBe("lovely-org");
      expect(response.data.repositoryOwner.repositories.nodes.length).toBe(1);
      expect(response.data.repositoryOwner.repositories.pageInfo).toBeDefined();
      expect(response.data.repositoryOwner.repositories.pageInfo.hasNextPage).toBe(false);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationRepository", () => {
    const query = gql`
      query repository($org: String!, $repoName: String!, $catalogPathRef: String!) {
        repositoryOwner(login: $org) {
          repository(name: $repoName) {
            name
            catalogInfoFile: object(expression: $catalogPathRef) {
              __typename
              ... on Blob {
                id
                text
              }
            }
            url
            isArchived
            isFork
            visibility
            repositoryTopics(first: 100) {
              nodes {
                ... on RepositoryTopic {
                  topic {
                    name
                  }
                }
              }
            }
            defaultBranchRef {
              name
            }
          }
        }
      }
    `;
    const variables = {
      org: "lovely-org",
      repoName: "awesome-repo",
      catalogPathRef: "./catalog-info.yaml",
    };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getOrganizationRepository With Fragment", () => {
    const query = gql`
      fragment RepositoryNode on Repository {
        url
        defaultBranchRef {
          name
        }
        ... on Repository {
          __typename
          isArchived
          visibility
          name
          nameWithOwner
          url
          description
          languages(first: 10) {
            nodes {
              __typename
              name
            }
          }
          repositoryTopics(first: 10) {
            nodes {
              __typename
              topic {
                name
              }
            }
          }
          owner {
            ... on Organization {
              __typename
              login
            }
            ... on User {
              __typename
              login
            }
          }
        }
      }
      query repositories($cursor: String, $org: String!, $first: Int) {
        repositoryOwner(login: $org) {
          repositories(first: $first, after: $cursor, isFork: false) {
            totalCount
            nodes {
              ...RepositoryNode
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;
    const variables = {
      org: "lovely-org",
    };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });

  describe("getTeamMembers", () => {
    const query = gql`
      query members($org: String!, $teamSlug: String!, $cursor: String) {
        organization(login: $org) {
          team(slug: $teamSlug) {
            members(first: 100, after: $cursor, membership: IMMEDIATE) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                login
              }
            }
          }
        }
      }
    `;
    const variables = {
      org: "lovely-org",
      teamSlug: "boop",
    };
    it("responds successfully to fetch", async () => {
      let request = await fetch(`${url}/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      let response = await request.json();
      expect(request.status).toEqual(200);
      expect(response.errors).toBe(undefined);
    });
    it("responds successfully to graphql client", async () => {
      let request = await client(query, variables);
      expect(request).toBeDefined();
    });
  });
});
